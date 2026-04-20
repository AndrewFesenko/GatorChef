"""Token cleaning — raw OCR line to a cleaned candidate string.

Each raw receipt line passes through here before abbreviation expansion
and canonical matching. The goal is to strip everything that isn't part
of the ingredient name: prices, weights, PLU codes, quantity prefixes,
separator punctuation, and known non-food line signatures.

Returns a title-cased string, or None when the line is recognized as
definitively non-food (tax/total/subtotal/store name patterns). Returning
None lets the pipeline skip the line entirely instead of passing garbage
downstream.
"""

from __future__ import annotations

import re

# --- patterns ---------------------------------------------------------------

# Whole-line non-food signatures. If any of these match (case-insensitive)
# the line is dropped before any cleaning happens.
_NON_FOOD_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"\b(sub\s*total|subtotal|total|tax|change|tend|tender|cash|debit|credit|visa|mastercard|amex)\b", re.IGNORECASE),
    re.compile(r"\b(balance|due|paid|refund|void|loyalty|points|reward|rewards|member)\b", re.IGNORECASE),
    re.compile(r"\b(thank\s*you|manager|cashier|lane|receipt|purchase|auth|approval)\b", re.IGNORECASE),
    re.compile(r"\b(store|ref|reg)\s*#", re.IGNORECASE),
    re.compile(r"\b(walmart|target|publix|kroger|safeway|costco|sam'?s\s*club|whole\s*foods|trader\s*joe|spar|aldi|lidl|cvs|walgreens|rite\s*aid|dollar\s*(general|tree)|family\s*dollar)\b", re.IGNORECASE),
    # Store address / header patterns
    re.compile(r"\b(save\s*money|live\s*better|low\s*prices|always\s*low|mgr|manager|survey|feedback|network\s*id|terminal|account|appr|approval\s*code|ref\s*#|eft\s*debit|items?\s*sold|sold\s*items?)\b", re.IGNORECASE),
    re.compile(r"\b(bag\s*fee|bottle\s*deposit|crv|recycling)\b", re.IGNORECASE),
)

# Token-level strips (applied in order).
_PRICE_WITH_SYMBOL = re.compile(r"\$\s*\d+(?:\.\d{1,2})?")
_BARE_DECIMAL = re.compile(r"\b\d+\.\d{1,2}\b")  # bare prices like "2.82"
_QUANTITY_RATIO = re.compile(r"\b\d+\s*/\s*\$?\s*\d+(?:\.\d{1,2})?\b")
_WEIGHT = re.compile(r"\b\d+(?:\.\d+)?\s*(?:oz|lb|lbs|g|kg|ml|l|ct|pk|pack|count)\b\.?", re.IGNORECASE)
_PLU = re.compile(r"\b\d{4,5}\b")  # 4-5 digit standalone (PLU)
_BARCODE = re.compile(r"\b\d{10,}\b")  # long standalone digit runs (UPC/EAN)
_QUANTITY_PREFIX = re.compile(r"^\s*\d+\s*[x/]?\s+", re.IGNORECASE)
_TRAILING_PRICE_MARKER = re.compile(r"(\s+[A-Z])+\s*$")  # one or more trailing single-letter codes (F N B W D X)
_SEPARATORS = re.compile(r"[/\\|#*;:]+")
_STRAY_DIGITS = re.compile(r"\b\d+\b")  # any isolated digit run left after other strips
# Trader Joe's / some stores prefix item lines with 1-2 letter codes: R-, A-, G-, SC-
_ITEM_CODE_PREFIX = re.compile(r"\b[A-Z]{1,2}-")
# Negation / absence descriptors — "NO SALT", "W/O FAT", "WITHOUT SUGAR"
# are product descriptors, not ingredients; strip so they don't fuzzy-match.
_NEGATION_PHRASE = re.compile(r"\b(no|w/o|without|non|free)\s+\w+", re.IGNORECASE)
# Walmart register header: ST# 01534 OP# 009048 TE# 48 TR# 04455
_REGISTER_HEADER = re.compile(r"\bST#?\s*\d+\s+OP#?\s*\d+\s+TE#?\s*\d+", re.IGNORECASE)
_MULTI_SPACE = re.compile(r"\s+")


def clean_line(line: str) -> str | None:
    """Return a cleaned, title-cased candidate, or None to drop the line."""
    if not line:
        return None

    text = line.strip()
    if not text:
        return None

    if _REGISTER_HEADER.search(text):
        return None

    for pat in _NON_FOOD_PATTERNS:
        if pat.search(text):
            return None

    # Strip price/quantity/weight/code tokens. Order matters: ratio before price,
    # weight before PLU (weights can look like 4-5 digit runs otherwise), barcode
    # before PLU so long runs don't leave a trailing short digit group.
    text = _NEGATION_PHRASE.sub(" ", text)
    text = _ITEM_CODE_PREFIX.sub(" ", text)
    text = _QUANTITY_RATIO.sub(" ", text)
    text = _PRICE_WITH_SYMBOL.sub(" ", text)
    text = _WEIGHT.sub(" ", text)
    text = _BARCODE.sub(" ", text)
    text = _PLU.sub(" ", text)
    text = _BARE_DECIMAL.sub(" ", text)
    text = _QUANTITY_PREFIX.sub("", text)
    text = _SEPARATORS.sub(" ", text)
    text = _STRAY_DIGITS.sub(" ", text)

    # Collapse whitespace first so the trailing-marker regex sees clean token
    # boundaries, then strip trailing single-letter category codes (F N B W…).
    text = _MULTI_SPACE.sub(" ", text).strip(" \t-.,")
    text = _TRAILING_PRICE_MARKER.sub("", text).strip(" \t-.,")
    if not text:
        return None

    # If nothing alphabetic survived, there's no ingredient here.
    if not re.search(r"[A-Za-z]", text):
        return None

    # Discard results that are too short to be an ingredient name — single letters
    # and very short tokens are almost always OCR artifacts or category codes.
    if len(text.replace(" ", "")) < 3:
        return None

    return text.title()
