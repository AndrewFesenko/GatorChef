"""Abbreviation expansion — cleaned token to a fuller expansion.

Runs two passes:
  1. Greedy multi-word phrase scan from longest to shortest. This preserves
     compound ingredients like "CHKN BRST" -> "chicken breast" as a single
     unit, so the downstream matcher sees "chicken breast" rather than two
     separate tokens that each expand independently.
  2. Single-token fallback: any token still in its cleaned form is checked
     against the table individually.

Returns the expanded string lowercased. If nothing matched, returns the input
lowercased so the matcher still has something to work with.
"""

from __future__ import annotations


def _build_phrase_lookup(table: dict[str, str]) -> tuple[dict[int, dict[str, str]], int]:
    """Group multi-word keys by word count for greedy left-to-right scanning."""
    by_length: dict[int, dict[str, str]] = {}
    max_len = 1
    for key, value in table.items():
        n = len(key.split())
        by_length.setdefault(n, {})[key] = value
        if n > max_len:
            max_len = n
    return by_length, max_len


def expand(token: str, table: dict[str, str]) -> str:
    """Expand a cleaned token using the abbreviation table."""
    if not token or not token.strip():
        return ""

    words = token.upper().split()
    if not words:
        return ""

    if not table:
        return token.lower()

    by_length, max_phrase_len = _build_phrase_lookup(table)

    out: list[str] = []
    i = 0
    while i < len(words):
        matched = False
        # Try longest phrase first, shrink down to a single token.
        for n in range(min(max_phrase_len, len(words) - i), 0, -1):
            phrase = " ".join(words[i : i + n])
            candidates = by_length.get(n)
            if candidates and phrase in candidates:
                out.append(candidates[phrase])
                i += n
                matched = True
                break
        if not matched:
            out.append(words[i].lower())
            i += 1

    return " ".join(out).strip()
