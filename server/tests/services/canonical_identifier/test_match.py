from app.services.canonical_identifier.match import (
    FUZZY_THRESHOLD,
    build_canonical_map,
    to_canonical,
)

CANONICAL_NAMES = [
    "Chicken Breast",
    "Chicken Thighs",
    "Carrot",
    "Broccoli",
    "Spinach",
    "Whole Milk",
    "Cheddar Cheese",
    "Roma Tomato",
    "Olive Oil",
    "Brown Rice",
]
CANONICAL_MAP = build_canonical_map(CANONICAL_NAMES)


class TestBuildCanonicalMap:
    def test_lowercases_keys_and_preserves_canonical_casing(self):
        m = build_canonical_map(["Olive Oil", "CHEDDAR CHEESE"])
        assert m["olive oil"] == "Olive Oil"
        assert m["cheddar cheese"] == "CHEDDAR CHEESE"

    def test_skips_blank_entries(self):
        m = build_canonical_map(["", "  ", "Carrot"])
        assert list(m.keys()) == ["carrot"]


class TestToCanonicalExact:
    def test_exact_case_insensitive_hit(self):
        r = to_canonical("chicken breast", CANONICAL_MAP)
        assert r is not None
        assert r.name == "Chicken Breast"
        assert r.kind == "exact"

    def test_exact_takes_priority_over_fuzzy(self):
        # "carrot" is an exact hit even though "Cheddar Cheese" would fuzzy-score.
        r = to_canonical("carrot", CANONICAL_MAP)
        assert r is not None
        assert r.name == "Carrot"
        assert r.kind == "exact"

    def test_whitespace_and_case_tolerated(self):
        r = to_canonical("  SPINACH  ", CANONICAL_MAP)
        assert r is not None
        assert r.name == "Spinach"
        assert r.kind == "exact"


class TestToCanonicalFuzzy:
    def test_ocr_noise_multi_word_missing_char(self):
        # Common OCR/abbreviation dropout: missing 'a' in breast.
        r = to_canonical("chicken brest", CANONICAL_MAP)
        assert r is not None
        assert r.name == "Chicken Breast"
        assert r.kind == "fuzzy"

    def test_word_order_swap_via_token_sort(self):
        r = to_canonical("cheese cheddar", CANONICAL_MAP)
        assert r is not None
        assert r.name == "Cheddar Cheese"
        assert r.kind == "fuzzy"

    def test_trailing_noise_within_tolerance(self):
        r = to_canonical("broccolix", CANONICAL_MAP)
        assert r is not None
        assert r.name == "Broccoli"
        assert r.kind == "fuzzy"


class TestToCanonicalMiss:
    def test_unrelated_token_returns_none(self):
        assert to_canonical("xyzzy", CANONICAL_MAP) is None

    def test_empty_inputs_return_none(self):
        assert to_canonical("", CANONICAL_MAP) is None
        assert to_canonical("   ", CANONICAL_MAP) is None
        assert to_canonical("chicken breast", {}) is None

    def test_too_far_below_threshold_returns_none(self):
        # "beef" has no canonical here and isn't fuzzy-close to any entry
        # above threshold.
        assert to_canonical("beef", CANONICAL_MAP) is None


class TestFuzzyThresholdSanity:
    def test_threshold_is_strict_enough_to_reject_nonsense(self):
        # If someone drops the threshold too low this test starts failing,
        # signaling that the fuzzy pass has become too permissive.
        assert FUZZY_THRESHOLD >= 80
