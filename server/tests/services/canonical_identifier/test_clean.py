import pytest

from app.services.canonical_identifier.clean import clean_line


class TestNonFoodFilter:
    @pytest.mark.parametrize("line", [
        "SUBTOTAL    12.45",
        "Sub Total 12.45",
        "TOTAL 14.32",
        "TAX 1         0.85",
        "CHANGE DUE     0.00",
        "DEBIT TEND",
        "VISA **** 1234",
        "BALANCE DUE 0.00",
        "LOYALTY POINTS EARNED 12",
        "THANK YOU FOR SHOPPING",
        "STORE # 1234",
        "CASHIER: JANE",
        "WALMART SUPERCENTER",
        "BAG FEE      0.05",
        "BOTTLE DEPOSIT 0.10",
    ])
    def test_drops_known_non_food_lines(self, line):
        assert clean_line(line) is None


class TestTokenStrips:
    def test_strips_price(self):
        assert clean_line("ROMA TOMATOES $3.49") == "Roma Tomatoes"

    def test_strips_quantity_ratio(self):
        assert clean_line("2 / $3.49 ROMA TOMATOES") == "Roma Tomatoes"

    def test_strips_weight_units(self):
        assert clean_line("CHICKEN BREAST 16oz") == "Chicken Breast"
        assert clean_line("BROCCOLI 1.5 LB") == "Broccoli"
        assert clean_line("WHOLE MILK 1G") is not None  # "1G" -> stripped as gram

    def test_strips_plu_code(self):
        assert clean_line("4011 BANANAS") == "Bananas"

    def test_strips_long_barcode(self):
        assert clean_line("GV WATER 007874235191") == "Gv Water"

    def test_strips_quantity_prefix(self):
        assert clean_line("3 APPLES") == "Apples"
        assert clean_line("2x YOGURT") == "Yogurt"

    def test_strips_separator_characters(self):
        assert clean_line("BROWN RICE / ORGANIC") == "Brown Rice Organic"
        assert clean_line("OLIVE OIL #1") == "Olive Oil"

    def test_strips_trailing_single_letter_marker(self):
        # Receipts often print F/N/T/B/W/D/X after the price as a tax/category code.
        assert clean_line("BREAD 2.82 B") == "Bread"
        assert clean_line("PKG SALAD 2.76 N") == "Pkg Salad"


class TestNormalization:
    def test_all_caps_to_title_case(self):
        assert clean_line("OLIVE OIL EV") == "Olive Oil Ev"

    def test_whitespace_collapsed(self):
        assert clean_line("  CHICKEN    BREAST  ") == "Chicken Breast"

    def test_preserves_alpha_only_tokens(self):
        assert clean_line("SPINACH") == "Spinach"


class TestEmptyAndJunk:
    def test_empty_returns_none(self):
        assert clean_line("") is None
        assert clean_line("   ") is None

    def test_numbers_only_returns_none(self):
        assert clean_line("12345") is None
        assert clean_line("3.49") is None

    def test_punctuation_only_returns_none(self):
        assert clean_line("***") is None
        assert clean_line("/ / /") is None
