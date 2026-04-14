from __future__ import annotations

import re


_RECEIPT_TRAILING_PRICE = re.compile(r"\s+\$?\d+\.\d{2}\s*$")
_RECEIPT_TRAILING_CODE = re.compile(r"\s+[A-Z0-9]{1,4}$")
_RECEIPT_TRAILING_SINGLE_LETTER = re.compile(r"\s+[A-Z]$")
_RECEIPT_SKU = re.compile(r"\b\d{4,}\b")
_RECEIPT_COMPACT_CODE = re.compile(r"\d+[A-Z0-9]*$")


def normalize(item_name: str) -> str:
    """Normalize a parsed item name without destroying casing.

    The goal here is to remove extra whitespace while keeping the human
    readable capitalization that came from OCR or the receipt parser.
    """
    cleaned = " ".join(item_name.strip().split())
    if not cleaned:
        return cleaned

    if cleaned.isupper():
        return " ".join(word.capitalize() if word.isalpha() else word for word in cleaned.split())

    return cleaned


def normalize_receipt_item_name(item_name: str) -> str:
    """Normalize a receipt-derived item name for pantry use.

    This removes common OCR leftovers like trailing prices, SKU fragments, and
    single-letter department markers while keeping the readable part of the name.
    """
    cleaned = normalize(item_name)
    if not cleaned:
        return cleaned

    cleaned = _RECEIPT_TRAILING_PRICE.sub("", cleaned)

    # strip obvious receipt suffixes only after removing prices so we do not
    # accidentally clip real item names
    while True:
        next_cleaned = _RECEIPT_TRAILING_SINGLE_LETTER.sub("", cleaned)
        next_cleaned = _RECEIPT_TRAILING_CODE.sub("", next_cleaned)
        if next_cleaned == cleaned:
            break
        cleaned = next_cleaned.strip()

    if " " not in cleaned and any(ch.isdigit() for ch in cleaned):
        cleaned = _RECEIPT_COMPACT_CODE.sub("", cleaned).strip()

    cleaned = _RECEIPT_SKU.sub("", cleaned)
    cleaned = " ".join(cleaned.split()).strip(" 	-*#|;:.,")

    if cleaned.isupper():
        cleaned = " ".join(word.capitalize() if word.isalpha() else word for word in cleaned.split())

    return cleaned
