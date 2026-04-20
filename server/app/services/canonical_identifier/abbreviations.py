"""Abbreviation table loader.

Loads `abbreviations.json` once per process. The file ships with the repo and
is hand-maintained — entries grow from review of unresolved.jsonl. Keys are
stored uppercase-normalized for lookup; values are lowercased expansions that
flow into the matching pass.
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path


def _data_dir() -> Path:
    override = os.getenv("CANONICAL_IDENTIFIER_DATA_DIR")
    if override:
        return Path(override)
    # server/app/services/canonical_identifier/abbreviations.py -> server/app/data
    return Path(__file__).resolve().parent.parent.parent / "data"


@lru_cache(maxsize=1)
def load_abbreviations() -> dict[str, str]:
    """Return { UPPER_KEY: lowercase expansion }."""
    path = _data_dir() / "abbreviations.json"
    if not path.exists():
        return {}

    with path.open("r", encoding="utf-8") as f:
        raw = json.load(f)

    out: dict[str, str] = {}
    for key, value in raw.items():
        if not isinstance(key, str) or not isinstance(value, str):
            continue
        if key.startswith("_"):  # comment/metadata keys
            continue
        clean_key = " ".join(key.strip().upper().split())
        clean_val = " ".join(value.strip().lower().split())
        if clean_key and clean_val:
            out[clean_key] = clean_val
    return out


def reset_cache() -> None:
    """Test helper — clear the cache so tests can swap data dirs."""
    load_abbreviations.cache_clear()
