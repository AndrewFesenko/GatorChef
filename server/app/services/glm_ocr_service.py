from __future__ import annotations

import difflib
import json
import os
import re
from collections.abc import Iterable
from pathlib import Path

from fastapi import HTTPException, status

from glmocr import GlmOcr
from glmocr.config import load_config

from app.services import normalizer, receipt_parser
from app.services.ingredient_loader import get_mealdb_ingredients


def _default_config_path() -> str | None:
    service_dir = Path(__file__).resolve().parent
    candidate = service_dir / "glm_ocr_config.yaml"
    if candidate.exists():
        return str(candidate)
    return None


def _parse_model_output(raw_output: str) -> list[str]:
    cleaned = raw_output.strip()
    if not cleaned:
        return []

    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        parsed = None

    if isinstance(parsed, list):
        return [str(item).strip() for item in parsed if str(item).strip()]

    if isinstance(parsed, dict):
        for key in ("items", "parsed_items", "ingredients", "names"):
            value = parsed.get(key)
            if isinstance(value, list):
                return [str(item).strip() for item in value if str(item).strip()]

    candidates = []
    for line in cleaned.splitlines():
        candidate = line.strip().strip("-•*")
        candidate = re.sub(r"^\d+[.)]\s*", "", candidate)
        if candidate:
            candidates.append(candidate)
    return candidates


def _canonicalize_names(names: list[str], canonical: list[str]) -> list[str]:
    canonical_map = {item.lower(): item for item in canonical}
    canonical_lower = list(canonical_map.keys())
    normalized: list[str] = []
    seen: set[str] = set()

    for name in names:
        cleaned = normalizer.normalize_receipt_item_name(name)
        if not cleaned:
            continue

        chosen = _find_best_canonical_match(cleaned, canonical_map, canonical_lower)

        if chosen is None:
            chosen = cleaned

        key = chosen.lower()
        if key not in seen:
            seen.add(key)
            normalized.append(chosen)

    return normalized


def _candidate_name_variants(name: str) -> Iterable[str]:
    base = " ".join(name.split()).strip(" \t-*#|;:.,")
    if not base:
        return []

    variants: list[str] = [base]

    # remove slash codes and ocr punctuation artifacts while preserving words
    no_symbols = re.sub(r"[^A-Za-z0-9 ]+", " ", base)
    no_symbols = " ".join(no_symbols.split())
    if no_symbols and no_symbols.lower() != base.lower():
        variants.append(no_symbols)

    # drop trailing 1-2 letter marker tokens common in receipt rows
    dropped_marker = re.sub(r"\s+[A-Za-z]{1,2}$", "", no_symbols).strip()
    if dropped_marker and dropped_marker.lower() != no_symbols.lower():
        variants.append(dropped_marker)

    # depluralize simple cases for better ingredient matching
    if dropped_marker.lower().endswith("es") and len(dropped_marker) > 4:
        variants.append(dropped_marker[:-2])
    if dropped_marker.lower().endswith("s") and len(dropped_marker) > 3:
        variants.append(dropped_marker[:-1])

    parts = dropped_marker.split()
    if len(parts) >= 2:
        variants.append(parts[-1])
        variants.append(" ".join(parts[-2:]))

    # de-duplicate while preserving order
    out: list[str] = []
    seen: set[str] = set()
    for variant in variants:
        key = variant.lower()
        if key and key not in seen:
            seen.add(key)
            out.append(variant)
    return out


def _find_best_canonical_match(
    cleaned_name: str,
    canonical_map: dict[str, str],
    canonical_lower: list[str],
) -> str | None:
    for variant in _candidate_name_variants(cleaned_name):
        lookup = variant.lower()

        exact = canonical_map.get(lookup)
        if exact is not None:
            return exact

        # prefer a strict match first
        strict = difflib.get_close_matches(lookup, canonical_lower, n=1, cutoff=0.84)
        if strict:
            return canonical_map[strict[0]]

        # relax cutoff for ocr-noisy names like carrof -> carrot
        relaxed = difflib.get_close_matches(lookup, canonical_lower, n=1, cutoff=0.76)
        if relaxed:
            return canonical_map[relaxed[0]]

    return None


async def extract_receipt_items(image_bytes: bytes) -> tuple[str, list[str]]:
    """Extract canonical pantry item names from a receipt image using GLM-OCR."""
    canonical = await get_mealdb_ingredients()
    if not canonical:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not load canonical ingredient list from TheMealDB.",
        )

    config_path = os.getenv("GLM_OCR_CONFIG") or _default_config_path()
    if not config_path or not Path(config_path).exists():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Missing GLM-OCR config. Create server/app/services/glm_ocr_config.yaml with your API key.",
        )

    config = load_config(config_path)
    if not config.pipeline.maas.api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GLM-OCR config is missing an API key.",
        )

    try:
        with GlmOcr(config_path=config_path, mode="maas") as parser:
            result = parser.parse(
                image_bytes,
                save_layout_visualization=False,
                need_layout_visualization=False,
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GLM-OCR failed to process the receipt: {exc}",
        ) from exc

    error_text = getattr(result, "_error", None)
    if error_text:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GLM-OCR returned an error: {error_text}",
        )

    raw_output = (getattr(result, "markdown_result", "") or "").strip()
    if not raw_output:
        json_result = getattr(result, "json_result", None)
        if json_result:
            raw_output = json.dumps(json_result, ensure_ascii=False)

    if not raw_output:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GLM-OCR returned an empty response.",
        )

    parsed_names = receipt_parser.parse(raw_output)
    if not parsed_names:
        parsed_names = _parse_model_output(raw_output)

    return raw_output, _canonicalize_names(parsed_names, canonical)


def extract_text(image_bytes: bytes) -> str:
    """Legacy helper that returns the raw GLM-OCR response text."""
    import asyncio

    raw_output, _ = asyncio.run(extract_receipt_items(image_bytes))
    return raw_output
