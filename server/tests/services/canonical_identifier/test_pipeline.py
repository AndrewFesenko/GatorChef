"""End-to-end pipeline tests.

GCV and GLM are mocked — no network calls. The OCR text fixtures are pre-seeded
from the real images in images/ so they reflect actual receipt formatting.

Run `python scripts/batch_ocr_test.py ../images` after enabling the Cloud Vision
API to regenerate tests/fixtures/ocr_results.json with live GCV output and
update the RAW_LINES fixtures below with the real extracted text.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

# ---------------------------------------------------------------------------
# Fixtures — OCR text pre-extracted from real images (mocked into extract_lines)
# Replace these with output from ocr_results.json once GCV is enabled.
# ---------------------------------------------------------------------------

# 1.jpg — Trader Joe's, Dallas TX 75206. Real GCV output captured 2026-04-20.
TRADER_JOES_RAW_LINES = [
    "TRADER JOE'S",
    "2001 Greenville Ave",
    "Dallas TX 75206",
    "Store #403",
    "(469) 334-0614",
    "OPEN 8:00AM TO 9:00PM DAILY",
    "R-CARROTS SHREDDED 10 OZ",
    "1.29",
    "R-CUCUMBERS PERSIAN 1 LB",
    "1.99",
    "TOMATOES CRUSHED NO SALT",
    "1.59",
    "TOMATOES WHOLE NO SALT W/BASIL",
    "1.59",
    "ORGANIC OLD FASHIONED OATMEAL",
    "2.69",
    "MINI-PEARL TOMATOES..",
    "2.49",
    "PKG SHREDDED MOZZARELLA LITE T 3.99",
    "EGGS 1 DOZ ORGANIC BROWN.",
    "3.79",
    "BEANS GARBANZO",
    "0.89",
    "SPROUTED CA STYLE",
    "2.99",
    "A-AVOCADOS HASS BAG 4CT",
    "3.99",
    "A-APPLE BAG JAZZ 2 LB",
    "2.99",
    "A-PEPPER BELL EACH XL RED",
    "0.99",
    "GROCERY NON TAXABLE",
    "0.98",
    "2 @ 0.49",
    "BANANAS ORGANIC",
    "0.87",
    "3EA @ 0.29/EA",
    "CREAMY SALTED PEANUT BUTTER",
    "2.49",
    "WHL WHT PITA BREAD",
    "1.69",
    "GROCERY NON TAXABLE",
    "1.38",
    "2 @ 0.69",
    "SUBTOTAL",
    "$38.68",
    "TOTAL",
    "CASH",
    "CHANGE",
    "ITEMS 22",
    "$38.68",
    "$40.00",
    "$1.32",
    "Higgins, Ryan",
    "06-28-2014 12:34PM 0403 04 1346 4683",
    "THANK YOU FOR SHOPPING AT",
    "TRADER JOE'S",
    "www.traderjoes.com",
]

# Realistic MealDB ingredient list subset used for all pipeline tests.
# Contains the ingredients visible in the Trader Joe's fixture.
# Matches the real MealDB canonical names returned for Trader Joe's items.
MOCK_MEALDB = [
    "Carrots", "Persian Cucumber", "Cucumber", "Tomatoes", "Oatmeal",
    "Mozzarella", "Eggs", "Chickpeas", "Avocado", "Apples", "Banana",
    "Peanut Butter", "Pita Bread", "Bell Pepper", "Pepper",
    "Spinach", "Olive Oil", "Brown Rice", "Garlic", "Chicken Breast",
    "Salmon", "Milk", "Cheese", "Bread", "Pasta", "Onion",
    "Potato", "Broccoli", "Cauliflower", "Mushrooms", "Salt", "Basil",
]

# Hand-labeled canonical names expected to be in extracted_items from 1.jpg.
# ≥ 60% of these must appear (the success criterion in v2-ocr_feature_objectives).
TRADER_JOES_EXPECTED_CANONICAL = {
    "Carrots",
    "Cucumber",       # may resolve as "Persian Cucumber" — checked via substring
    "Tomatoes",
    "Oatmeal",
    "Mozzarella",
    "Eggs",
    "Chickpeas",      # "BEANS GARBANZO" expands via abbreviations table
    "Avocado",
    "Apples",
    "Banana",
    "Peanut Butter",
}

# Minimum fraction of EXPECTED that must appear in pipeline output.
MIN_RECALL = 0.60

# Minimum fraction of pipeline output that must be canonical (precision).
MIN_PRECISION = 0.80


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestPipelineTraderJoes:
    """End-to-end pipeline run on the Trader Joe's 1.jpg fixture."""

    @pytest.fixture(autouse=True)
    def mock_ocr(self):
        raw = "\n".join(TRADER_JOES_RAW_LINES)
        with patch(
            "app.services.canonical_identifier.pipeline.extract_lines",
            return_value=(raw, TRADER_JOES_RAW_LINES),
        ):
            yield

    @pytest.fixture(autouse=True)
    def mock_mealdb(self):
        with patch(
            "app.services.canonical_identifier.pipeline.get_mealdb_ingredients",
            return_value=MOCK_MEALDB,
        ):
            yield

    @pytest.fixture(autouse=True)
    def mock_fallback(self):
        with patch(
            "app.services.canonical_identifier.pipeline.fallback.resolve",
            return_value=None,
        ):
            yield

    def _run_pipeline(self):
        from app.services.canonical_identifier.pipeline import identify_receipt
        return _run(identify_receipt(b"fake", uid="test_uid", session_id="test_session"))

    def test_no_non_food_in_extracted_items(self):
        result = self._run_pipeline()
        names = {item.name for item in result.extracted_items}
        non_food_markers = {"subtotal", "total", "cash", "change", "thank you", "tax"}
        for name in names:
            assert name.lower() not in non_food_markers, f"Non-food '{name}' leaked into results"

    def test_recall_meets_minimum_threshold(self):
        result = self._run_pipeline()
        resolved_lower = {item.name.lower() for item in result.extracted_items}
        matched = sum(
            1 for expected in TRADER_JOES_EXPECTED_CANONICAL
            if any(expected.lower() in r or r in expected.lower() for r in resolved_lower)
        )
        recall = matched / len(TRADER_JOES_EXPECTED_CANONICAL)
        assert recall >= MIN_RECALL, (
            f"Recall {recall:.0%} < {MIN_RECALL:.0%}. "
            f"Matched {matched}/{len(TRADER_JOES_EXPECTED_CANONICAL)}: "
            f"resolved={sorted(resolved_lower)}"
        )

    def test_no_duplicates_in_extracted_items(self):
        result = self._run_pipeline()
        names = [item.name.lower() for item in result.extracted_items]
        assert len(names) == len(set(names)), f"Duplicates found: {names}"

    def test_expected_items_not_stranded_in_unresolved(self):
        result = self._run_pipeline()
        extracted_lower = {item.name.lower() for item in result.extracted_items}
        # An expected item is "stranded" if it's in unresolved AND didn't make it
        # into extracted_items — meaning the pipeline silently dropped it.
        for raw_line in result.unresolved:
            for expected in TRADER_JOES_EXPECTED_CANONICAL:
                if expected.lower() in raw_line.lower() and expected.lower() not in extracted_lower:
                    pytest.fail(
                        f"'{expected}' visible in unresolved line '{raw_line}' "
                        f"but not found in extracted_items."
                    )

    def test_warnings_empty_for_good_receipt(self):
        result = self._run_pipeline()
        assert result.warnings == [], f"Unexpected warnings: {result.warnings}"


class TestPipelineWarnings:
    """Warning heuristics fire correctly for bad inputs."""

    @pytest.fixture(autouse=True)
    def mock_mealdb(self):
        with patch(
            "app.services.canonical_identifier.pipeline.get_mealdb_ingredients",
            return_value=MOCK_MEALDB,
        ):
            yield

    @pytest.fixture(autouse=True)
    def mock_fallback(self):
        with patch(
            "app.services.canonical_identifier.pipeline.fallback.resolve",
            return_value=None,
        ):
            yield

    def test_unreadable_image_warning_when_no_text(self):
        from app.services.canonical_identifier.pipeline import identify_receipt
        with patch(
            "app.services.canonical_identifier.pipeline.extract_lines",
            return_value=("", []),
        ):
            result = _run(identify_receipt(b"bad", uid="u", session_id="s"))
        assert any("Unreadable" in w or "could not extract" in w for w in result.warnings)

    def test_no_match_warning_when_text_but_nothing_resolved(self):
        from app.services.canonical_identifier.pipeline import identify_receipt
        garbage_lines = ["XYZZY PLUGH FROBOZZ", "ZZZ 999 ###", "QWERT YUIOP"]
        raw = "\n".join(garbage_lines)
        with patch(
            "app.services.canonical_identifier.pipeline.extract_lines",
            return_value=(raw, garbage_lines),
        ):
            result = _run(identify_receipt(b"garbage", uid="u", session_id="s"))
        assert any("no ingredients" in w.lower() or "not a grocery" in w.lower() for w in result.warnings)
