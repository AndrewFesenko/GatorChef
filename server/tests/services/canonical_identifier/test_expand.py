from app.services.canonical_identifier.expand import expand

TABLE = {
    "CHKN BRST": "chicken breast",
    "CHKN": "chicken",
    "BRST": "breast",
    "WHL MLK": "whole milk",
    "MLK": "milk",
    "BNLSS": "boneless",
    "ORG SPNCH": "spinach",
    "SPNCH": "spinach",
}


class TestMultiWordPriority:
    def test_longer_phrase_wins_over_single_tokens(self):
        # "CHKN BRST" is in the table as a phrase — it should expand as a unit,
        # not as two separate single-token hits.
        assert expand("CHKN BRST", TABLE) == "chicken breast"

    def test_prefix_expansion_then_tail_passthrough(self):
        # "BNLSS" expands, "CHKN BRST" expands as a unit.
        assert expand("BNLSS CHKN BRST", TABLE) == "boneless chicken breast"

    def test_single_token_when_phrase_not_present(self):
        assert expand("CHKN", TABLE) == "chicken"


class TestUnknownTokens:
    def test_unknown_token_passes_through_lowercased(self):
        assert expand("QUINOA", TABLE) == "quinoa"

    def test_mixed_known_and_unknown(self):
        # "WHL MLK" is a phrase entry; "BOTTLE" is not in the table.
        assert expand("WHL MLK BOTTLE", TABLE) == "whole milk bottle"


class TestEmptyInputs:
    def test_empty_string(self):
        assert expand("", TABLE) == ""

    def test_whitespace_only(self):
        assert expand("   ", TABLE) == ""

    def test_empty_table_returns_lowercased_input(self):
        assert expand("CHKN BRST", {}) == "chkn brst"


class TestCaseHandling:
    def test_lowercase_input_still_matches(self):
        # Table keys are uppercase; the function should upper-case for lookup.
        assert expand("chkn brst", TABLE) == "chicken breast"

    def test_mixed_case_input(self):
        assert expand("Chkn Brst", TABLE) == "chicken breast"
