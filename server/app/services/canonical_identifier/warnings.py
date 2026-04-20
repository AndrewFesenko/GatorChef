"""Heuristic warning builder (v2 doc § "Bugged upload detection").

Thresholds are starting points — tune after reviewing real session data.
"""

from __future__ import annotations


def build_warnings(raw_text: str, extracted_count: int) -> list[str]:
    w: list[str] = []
    text_len = len(raw_text)

    if text_len < 20:
        w.append("Unreadable image — could not extract text.")
    elif extracted_count == 0:
        w.append("Text found but no ingredients matched. The image may not be a grocery receipt.")

    if extracted_count > 30:
        w.append("Unusually large result — review extracted items before adding to pantry.")

    return w
