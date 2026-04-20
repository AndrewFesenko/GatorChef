"""Dictionary matching against the MealDB canonical ingredient list.

Two passes, in order:
  1. Exact lookup on the lowercased token against a precomputed canonical map.
  2. Fuzzy match via RapidFuzz `token_sort_ratio` with a threshold.

The pipeline orchestrator builds the canonical map once at startup
(from `ingredient_loader.get_mealdb_ingredients()`) and reuses it for every
line of every receipt — no per-line work beyond the lookup.
"""

from __future__ import annotations

from typing import Literal, NamedTuple

from rapidfuzz import fuzz, process

MatchKind = Literal["exact", "fuzzy"]

# Fuzzy threshold tuned for grocery-receipt noise. 85 is high enough to reject
# unrelated tokens (e.g. "bread" vs "beef") while still forgiving common OCR
# substitutions like carrof->carrot and abbreviation residue. Revisit after
# reviewing unresolved.jsonl from real scans.
FUZZY_THRESHOLD = 85


class MatchResult(NamedTuple):
    name: str
    kind: MatchKind


def build_canonical_map(names: list[str]) -> dict[str, str]:
    """Build a lowercased-key -> canonical-name map for exact lookup.

    Later entries win on collision, which is fine: MealDB returns a flat list
    of unique names so collisions are not expected.
    """
    return {name.lower(): name for name in names if name and name.strip()}


def to_canonical(token: str, canonical_map: dict[str, str]) -> MatchResult | None:
    """Resolve a cleaned/expanded token to a canonical MealDB ingredient name.

    Returns None when no pass succeeds; the caller should then try the GLM
    fallback and re-enter this function with the fallback's output.
    """
    key = (token or "").strip().lower()
    if not key or not canonical_map:
        return None

    exact = canonical_map.get(key)
    if exact is not None:
        return MatchResult(name=exact, kind="exact")

    best = process.extractOne(
        key,
        canonical_map.keys(),
        scorer=fuzz.token_sort_ratio,
        score_cutoff=FUZZY_THRESHOLD,
    )
    if best is not None:
        return MatchResult(name=canonical_map[best[0]], kind="fuzzy")

    # Last resort: try sub-sequences of the token. Handles noisy multi-word
    # lines like "pkg shredded mozzarella lite" → "mozzarella" and
    # "creamy salted peanut butter" → "peanut butter".
    # Try bigrams first (preserve 2-word canonical names), then single words.
    all_words = key.split()
    candidates: list[str] = []
    # bigrams (consecutive word pairs)
    for i in range(len(all_words) - 1):
        candidates.append(f"{all_words[i]} {all_words[i + 1]}")
    # single words ≥ 4 chars; prefer later words
    candidates.extend(w for w in reversed(all_words) if len(w) >= 4)

    for candidate in candidates:
        exact = canonical_map.get(candidate)
        if exact is not None and len(candidate) >= 4:
            return MatchResult(name=exact, kind="exact")
        sub_best = process.extractOne(
            candidate,
            canonical_map.keys(),
            scorer=fuzz.token_sort_ratio,
            score_cutoff=FUZZY_THRESHOLD,
        )
        # Require matched canonical key to be ≥ 4 chars to prevent short
        # canonical names (Cod, Rum, Gin) from matching noise words (code, run).
        if sub_best is not None and len(sub_best[0]) >= 4:
            return MatchResult(name=canonical_map[sub_best[0]], kind="fuzzy")

    return None
