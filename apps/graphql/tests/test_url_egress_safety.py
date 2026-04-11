"""Egress URL rules (``url_safety`` package — same rules GraphQL registration uses)."""

import pytest

from url_safety.egress import parse_and_validate_egress_https_url


@pytest.mark.parametrize(
    "url",
    [
        "http://example.com/",
        "https://user:pass@example.com/",
        "https://127.0.0.1/foo",
        "https://10.0.0.1/",
        "https://192.168.1.1/",
        "https://169.254.169.254/latest/meta-data/",
        "https://localhost/api",
        "https://app.local/foo",
        "https://metadata.google.internal/",
        "ftp://example.com/",
    ],
)
def test_parse_and_validate_rejects_unsafe(url: str):
    with pytest.raises(ValueError):
        parse_and_validate_egress_https_url(url)


def test_parse_and_validate_accepts_public_https():
    assert parse_and_validate_egress_https_url("https://example.com/path?q=1").startswith("https://")
