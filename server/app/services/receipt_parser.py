from __future__ import annotations

import re


_HTML_ROW_RE = re.compile(r"<tr>(.*?)</tr>", re.IGNORECASE | re.DOTALL)
_HTML_CELL_RE = re.compile(r"<t[dh]>(.*?)</t[dh]>", re.IGNORECASE | re.DOTALL)


_SKIP_PATTERNS = [
    re.compile(r"(?i)^(sub\s*total|subtotal|total|tax|change|balance|savings)"),
    re.compile(r"(?i)^(eft|us debit|debit|tender|pay from primary|shop card|card activation)"),
    re.compile(r"(?i)^(network id|terminal #|ref #|account|appr\.? code|tran amt|end bal|beg bal)"),
    re.compile(r"(?i)^(items sold|item(s)? sold|store|receipt|self checkout|activation)"),
    re.compile(r"(?i)(visa|mastercard|debit|credit|card\s*#|card\s*num)"),
    re.compile(r"(?i)(thank\s*you|welcome|come\s*again|store\s*#|cashier)"),
    re.compile(r"(?i)(shop card|us debit|eft debit|debit tend|change due|tax \d|subtotal)"),
    re.compile(r"(?i)^\d{2}[/-]\d{2}[/-]\d{2,4}"),
    re.compile(r"^\d{10,}$"),
    re.compile(r"(?i)^(tel|phone|fax|www\.|http)"),
    re.compile(r"^\s*$"),
]

_TRAILING_PRICE = re.compile(r"\s+\$?\d+\.\d{2}\s*$")
_PRICE_ONLY = re.compile(r"^\s*-?\$?\d+\.\d{2}\s*$")
_QTY_PREFIX = re.compile(r"^\d+\s*[x@]\s*", re.IGNORECASE)
_SKU = re.compile(r"\b[A-Z]?\s?\d{6,}\b")
_WEIGHT_SUFFIX = re.compile(r"\s+\d+\.?\d*\s*(lb|lbs|kg|oz|g)\b", re.IGNORECASE)
_PROMO_DETAIL = re.compile(
    r"(?i)^(\d+\s*@\s*\d+\s*for\s*\d+(?:\.\d{2})?|\d+\.?\d*\s*(lb|lbs|kg|oz|g)\s*@\s*\d+\.\d{2}/\s*(lb|lbs|kg|oz|g)|\d+\s*for\s*\d+(?:\.\d{2})?|\d+\s*for)$"
)

_STOP_WORDS = (
    "subtotal",
    "total",
    "tax",
    "change due",
    "debit tend",
    "shop card",
    "us debit",
    "eft debit",
    "activation",
    "network id",
    "terminal",
    "receipt",
    "items sold",
    "savings",
    "free shipping",
    "freeshipping",
    "learn more",
    "visit samsclub",
    "samsclub.com",
    "self checkout",
)


def parse(raw_text: str) -> list[str]:
    """Parse OCR receipt text into cleaned ingredient-like item names."""
    items: list[str] = []

    # prefer structured rows from glm-ocr html table output
    for row in _HTML_ROW_RE.findall(raw_text):
        cells = [re.sub(r"\s+", " ", _strip_tags(cell)).strip() for cell in _HTML_CELL_RE.findall(row)]
        if len(cells) < 2:
            continue

        candidate = _pick_row_candidate(cells)
        if not candidate:
            continue

        cleaned = _clean_candidate(candidate)
        if cleaned and _looks_like_item(cleaned):
            items.append(cleaned)

    # fallback to plain text when structured rows are not useful
    if items:
        return _dedupe(items)

    for line in raw_text.split("\n"):
        line = line.strip()

        if not line:
            continue
        if _PRICE_ONLY.match(line):
            continue
        if any(pattern.search(line) for pattern in _SKIP_PATTERNS):
            continue

        cleaned = _clean_candidate(line)
        if not cleaned:
            continue

        if not _looks_like_item(cleaned):
            continue

        items.append(cleaned)

    return _dedupe(items)


def _strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", " ", value)


def _clean_candidate(value: str) -> str:
    cleaned = _strip_tags(value)
    cleaned = re.sub(r"&nbsp;|&#160;", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = _TRAILING_PRICE.sub("", cleaned)
    cleaned = _QTY_PREFIX.sub("", cleaned)
    cleaned = _SKU.sub("", cleaned)
    cleaned = _WEIGHT_SUFFIX.sub("", cleaned)
    cleaned = cleaned.strip(" \t-*#|;:.,")
    return cleaned


def _pick_row_candidate(cells: list[str]) -> str:
    for cell in cells:
        if _is_rejected(cell):
            continue
        cleaned = _clean_candidate(cell)
        if cleaned and _looks_like_item(cleaned):
            return cell

    return ""


def _is_rejected(value: str) -> bool:
    lowered = value.lower().strip()
    if not lowered:
        return True
    if _PRICE_ONLY.match(lowered):
        return True
    if any(stop_word in lowered for stop_word in _STOP_WORDS):
        return True
    if any(pattern.search(lowered) for pattern in _SKIP_PATTERNS):
        return True
    return False


def _looks_like_item(value: str) -> bool:
    lowered = value.lower()
    if _is_rejected(lowered):
        return False
    if _PROMO_DETAIL.match(lowered):
        return False

    alpha_chars = sum(1 for ch in value if ch.isalpha())
    if alpha_chars < 2:
        return False

    # must contain at least one likely product word and not just code fragments
    return bool(re.search(r"[A-Za-z]{3,}", value))


def _dedupe(values: list[str]) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()

    for value in values:
        key = value.lower().strip()
        if key and key not in seen:
            seen.add(key)
            deduped.append(value)

    return deduped
