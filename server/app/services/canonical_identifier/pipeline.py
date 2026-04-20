"""Receipt identification orchestrator.

Single entry point: identify_receipt(image_bytes, uid, session_id).
Runs each line through: clean -> expand -> match -> (fallback -> re-match).
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.services.canonical_identifier import abbreviations as abbrev_module
from app.services.canonical_identifier import fallback, warnings
from app.services.canonical_identifier.clean import clean_line
from app.services.canonical_identifier.expand import expand
from app.services.canonical_identifier.match import MatchResult, build_canonical_map, to_canonical
from app.services.canonical_identifier.ocr import extract_lines
from app.services.canonical_identifier.unresolved_log import log_unresolved
from app.services.ingredient_loader import get_mealdb_ingredients


@dataclass
class ExtractedItem:
    name: str
    source_line: str
    match_kind: str  # "exact" | "fuzzy" | "glm_fallback"


@dataclass
class PipelineResult:
    raw_text: str
    extracted_items: list[ExtractedItem] = field(default_factory=list)
    unresolved: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


async def identify_receipt(
    image_bytes: bytes,
    uid: str,
    session_id: str,
) -> PipelineResult:
    """Run the full pipeline on a receipt image."""
    raw_text, lines = extract_lines(image_bytes)

    mealdb_names = await get_mealdb_ingredients()
    canonical_map = build_canonical_map(mealdb_names)
    abbrev_table = abbrev_module.load_abbreviations()

    extracted: list[ExtractedItem] = []
    unresolved: list[str] = []
    seen_canonical: set[str] = set()

    for raw_line in lines:
        cleaned = clean_line(raw_line)
        if cleaned is None:
            continue

        expanded = expand(cleaned, abbrev_table)

        match: MatchResult | None = to_canonical(expanded, canonical_map)

        if match is None:
            # GLM fallback — passes canonical_map in to avoid circular import.
            glm_name = fallback.resolve(
                raw_line=raw_line,
                cleaned=cleaned,
                expanded=expanded,
                canonical_map=canonical_map,
            )
            if glm_name:
                key = glm_name.lower()
                if key not in seen_canonical:
                    seen_canonical.add(key)
                    extracted.append(ExtractedItem(
                        name=glm_name,
                        source_line=raw_line,
                        match_kind="glm_fallback",
                    ))
            else:
                unresolved.append(raw_line)
                _safe_log_unresolved(
                    uid=uid,
                    session_id=session_id,
                    raw_line=raw_line,
                    cleaned=cleaned,
                    expanded=expanded,
                )
        else:
            key = match.name.lower()
            if key not in seen_canonical:
                seen_canonical.add(key)
                extracted.append(ExtractedItem(
                    name=match.name,
                    source_line=raw_line,
                    match_kind=match.kind,
                ))

    warning_msgs = warnings.build_warnings(raw_text, len(extracted))

    return PipelineResult(
        raw_text=raw_text,
        extracted_items=extracted,
        unresolved=unresolved,
        warnings=warning_msgs,
    )


def _safe_log_unresolved(**kwargs) -> None:
    try:
        log_unresolved(**kwargs)
    except Exception:
        pass  # unresolved logging must never crash a receipt upload
