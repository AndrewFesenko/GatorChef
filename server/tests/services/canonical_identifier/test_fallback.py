"""Tests for fallback.py — ZhipuAI GLM resolver for unmatched lines."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from app.services.canonical_identifier.match import build_canonical_map

CANONICAL = ["Chicken Breast", "Spinach", "Olive Oil", "Brown Rice", "Garlic"]
CANONICAL_MAP = build_canonical_map(CANONICAL)


def _mock_httpx(content: str, status: int = 200):
    """Return a mock that makes httpx.post return a chat completion response."""
    mock_resp = MagicMock()
    mock_resp.status_code = status
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json = MagicMock(return_value={
        "choices": [{"message": {"content": content}}]
    })
    return mock_resp


def _patch_key(monkeypatch=None):
    """Patch _load_api_key to return a fake key so config lookup is skipped."""
    return patch(
        "app.services.canonical_identifier.fallback._load_api_key",
        return_value="fake-api-key",
    )


class TestResolveWithGlm:
    def test_valid_glm_response_that_matches_canonical(self):
        from app.services.canonical_identifier import fallback
        with _patch_key(), patch("httpx.post", return_value=_mock_httpx('{"ingredient": "chicken breast"}')):
            result = fallback.resolve("CHKN BRST", "Chkn Brst", "chicken breast", CANONICAL_MAP)
        assert result == "Chicken Breast"

    def test_glm_response_that_fails_canonical_round_trip_returns_none(self):
        from app.services.canonical_identifier import fallback
        with _patch_key(), patch("httpx.post", return_value=_mock_httpx('{"ingredient": "unicorn steak"}')):
            result = fallback.resolve("XYZZY", "Xyzzy", "xyzzy", CANONICAL_MAP)
        assert result is None

    def test_glm_null_ingredient_returns_none(self):
        from app.services.canonical_identifier import fallback
        with _patch_key(), patch("httpx.post", return_value=_mock_httpx('{"ingredient": null}')):
            result = fallback.resolve("SHEET FOIL", "Sheet Foil", "sheet foil", CANONICAL_MAP)
        assert result is None

    def test_glm_fuzzy_match_accepted(self):
        from app.services.canonical_identifier import fallback
        with _patch_key(), patch("httpx.post", return_value=_mock_httpx('{"ingredient": "olive oill"}')):
            result = fallback.resolve("OLV OIL", "Olv Oil", "olive oil", CANONICAL_MAP)
        assert result == "Olive Oil"

    def test_glm_markdown_fenced_response_parsed(self):
        from app.services.canonical_identifier import fallback
        fenced = '```json\n{"ingredient": "spinach"}\n```'
        with _patch_key(), patch("httpx.post", return_value=_mock_httpx(fenced)):
            result = fallback.resolve("ORG SPNCH", "Org Spnch", "spinach", CANONICAL_MAP)
        assert result == "Spinach"


class TestResolveWithoutGlm:
    def test_no_api_key_returns_none_gracefully(self):
        from app.services.canonical_identifier import fallback
        with patch("app.services.canonical_identifier.fallback._load_api_key", return_value=None):
            result = fallback.resolve("XYZZY", "Xyzzy", "xyzzy", CANONICAL_MAP)
        assert result is None

    def test_httpx_exception_returns_none_gracefully(self):
        from app.services.canonical_identifier import fallback
        with _patch_key(), patch("httpx.post", side_effect=Exception("network timeout")):
            result = fallback.resolve("XYZZY", "Xyzzy", "xyzzy", CANONICAL_MAP)
        assert result is None

    def test_http_error_returns_none_gracefully(self):
        from app.services.canonical_identifier import fallback
        mock_resp = _mock_httpx("", status=500)
        mock_resp.raise_for_status.side_effect = Exception("500 Server Error")
        with _patch_key(), patch("httpx.post", return_value=mock_resp):
            result = fallback.resolve("XYZZY", "Xyzzy", "xyzzy", CANONICAL_MAP)
        assert result is None
