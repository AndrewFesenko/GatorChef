import re


# Lines that are clearly not grocery items
_SKIP_PATTERNS = [
    re.compile(r"(?i)^(sub\s*total|subtotal|total|tax|change|balance|savings)"),
    re.compile(r"(?i)(visa|mastercard|debit|credit|card\s*#|card\s*num)"),
    re.compile(r"(?i)(thank\s*you|welcome|come\s*again|store\s*#|cashier)"),
    re.compile(r"(?i)^\d{2}[/-]\d{2}[/-]\d{2,4}"),  # dates
    re.compile(r"^\d{10,}$"),                          # barcodes / long numbers
    re.compile(r"(?i)^(tel|phone|fax|www\.|http)"),
    re.compile(r"^\s*$"),                               # blank lines
]

# Price at end of line: optional whitespace + optional $ + digits.digits
_TRAILING_PRICE = re.compile(r"\s+\$?\d+\.\d{2}\s*$")

# Price-only line
_PRICE_ONLY = re.compile(r"^\s*-?\$?\d+\.\d{2}\s*$")

# Quantity prefix like "2 x " or "3@"
_QTY_PREFIX = re.compile(r"^\d+\s*[x@]\s*", re.IGNORECASE)

# SKU-like codes: sequences of 6+ digits, or letter-digit codes like "F 123456"
_SKU = re.compile(r"\b[A-Z]?\s?\d{6,}\b")

# Weight/unit suffix like "1.5 lb" or "0.45 kg"
_WEIGHT_SUFFIX = re.compile(r"\s+\d+\.?\d*\s*(lb|lbs|kg|oz|g)\b", re.IGNORECASE)


def parse(raw_text: str) -> list[str]:
    """Parse raw OCR text from a receipt into a list of cleaned item names."""
    lines = raw_text.split("\n")
    items: list[str] = []

    for line in lines:
        line = line.strip()

        # Skip empty or junk lines
        if not line:
            continue
        if _PRICE_ONLY.match(line):
            continue
        if any(p.search(line) for p in _SKIP_PATTERNS):
            continue

        # Clean the line
        cleaned = line
        cleaned = _TRAILING_PRICE.sub("", cleaned)
        cleaned = _QTY_PREFIX.sub("", cleaned)
        cleaned = _SKU.sub("", cleaned)
        cleaned = _WEIGHT_SUFFIX.sub("", cleaned)
        cleaned = cleaned.strip(" \t-*#")

        # Skip if cleaning left nothing meaningful (< 2 chars)
        if len(cleaned) < 2:
            continue

        items.append(cleaned)

    return items
