"""GLM fallback resolver for lines that failed dictionary matching.

Calls ZhipuAI chat completions (GLM-4-Flash) via direct httpx POST using the
API key from glm_ocr_config.yaml. The GLM is asked only to name the most
likely generic ingredient; its output re-enters match.to_canonical for
validation so the fallback can never write a non-canonical name to pantry.

Returns None when:
  - GLM config / API key is missing (graceful degradation, not a 500)
  - GLM produces no usable output
  - GLM output doesn't round-trip through match.to_canonical

Batched-call pattern is deferred; per-line for now, revisit after seeing
real unresolved-log traffic.
"""

from __future__ import annotations

import json
import logging
import os
from functools import lru_cache
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

_ZHIPU_CHAT_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
_FALLBACK_MODEL = "glm-4-flash"
_TIMEOUT = 10.0

_PROMPT_TEMPLATE = """\
You are a grocery ingredient identifier.
Given a raw receipt line and its partially cleaned form, identify the single \
most likely generic food ingredient name. Reply with ONLY a JSON object:
  {{"ingredient": "<lowercase canonical name>"}}
If no food ingredient can be identified, reply: {{"ingredient": null}}

Raw receipt line: {raw_line}
Cleaned token: {expanded}
"""


def _default_config_path() -> str | None:
    candidate = Path(__file__).resolve().parent.parent / "glm_ocr_config.yaml"
    return str(candidate) if candidate.exists() else None


@lru_cache(maxsize=1)
def _load_api_key() -> str | None:
    """Extract ZhipuAI API key from glm_ocr_config.yaml. Cached after first load."""
    # env override takes precedence
    if os.getenv("ZHIPU_API_KEY"):
        return os.getenv("ZHIPU_API_KEY")

    config_path = os.getenv("GLM_OCR_CONFIG") or _default_config_path()
    if not config_path or not Path(config_path).exists():
        return None

    try:
        import yaml  # pyyaml — available via glmocr's deps
        with open(config_path, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
        key = cfg.get("pipeline", {}).get("maas", {}).get("api_key", "")
        return key.strip() if key and key.strip() else None
    except Exception as exc:
        logger.debug("Could not read GLM API key from config: %s", exc)
        return None


def _parse_candidate(raw_output: str) -> str | None:
    """Pull the ingredient string out of a GLM JSON response."""
    text = raw_output.strip()

    # Strip markdown code fences if present
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 2:
            inner = parts[1].strip()
            if "\n" in inner:  # skip language tag line (e.g. "json\n{...}")
                inner = inner.split("\n", 1)[1].strip()
            text = inner

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return None

    if isinstance(parsed, dict):
        candidate = parsed.get("ingredient")
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
    return None


def resolve(
    raw_line: str,
    cleaned: str,
    expanded: str,
    canonical_map: dict[str, str],
) -> str | None:
    """Ask GLM to identify the ingredient; validate result through match."""
    from app.services.canonical_identifier.match import to_canonical

    api_key = _load_api_key()
    if not api_key:
        logger.debug("GLM fallback skipped — no API key available")
        return None

    prompt = _PROMPT_TEMPLATE.format(raw_line=raw_line, expanded=expanded)

    try:
        response = httpx.post(
            _ZHIPU_CHAT_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": _FALLBACK_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
            },
            timeout=_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json()
        raw_output = data["choices"][0]["message"]["content"]
    except Exception as exc:
        logger.warning("GLM fallback call failed for '%s': %s", raw_line, exc)
        return None

    candidate = _parse_candidate(raw_output)
    if not candidate:
        return None

    match = to_canonical(candidate, canonical_map)
    if match is None:
        logger.debug("GLM produced '%s' which did not match canonical list (line: %s)", candidate, raw_line)
    return match.name if match else None


def reset_cache() -> None:
    """Test helper — clear API key cache."""
    _load_api_key.cache_clear()
