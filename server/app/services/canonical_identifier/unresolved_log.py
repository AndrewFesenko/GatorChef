"""Append-only JSONL log of lines that the pipeline could not resolve.

Every null result after the GLM fallback gets written here. Over time this file
reveals which abbreviations to add to abbreviations.json.

File is gitignored (see server/app/data/.gitignore) and created on first write.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path


def _log_path() -> Path:
    override = os.getenv("CANONICAL_IDENTIFIER_DATA_DIR")
    base = Path(override) if override else Path(__file__).resolve().parent.parent.parent / "data"
    return base / "unresolved.jsonl"


def log_unresolved(
    *,
    uid: str,
    session_id: str,
    raw_line: str,
    cleaned: str,
    expanded: str,
) -> None:
    entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "uid": uid,
        "session_id": session_id,
        "raw_line": raw_line,
        "cleaned": cleaned,
        "expanded": expanded,
    }
    path = _log_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
