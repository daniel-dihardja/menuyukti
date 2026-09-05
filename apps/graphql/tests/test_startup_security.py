"""Startup security guards for GraphQL internal API key."""

import pytest
from graphql.server import is_production_runtime, validate_startup_security


def test_validate_startup_allows_local_without_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GRAPHQL_ENV", raising=False)
    monkeypatch.delenv("ENV", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.setenv("NODE_ENV", "development")
    monkeypatch.setenv("GRAPHQL_REQUIRE_INTERNAL_API_KEY", "")
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "")
    validate_startup_security()


def test_validate_startup_requires_key_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "")
    with pytest.raises(RuntimeError, match="INTERNAL_API_KEY"):
        validate_startup_security()


def test_validate_startup_accepts_graphql_internal_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "secret")
    validate_startup_security()


def test_is_production_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GRAPHQL_ENV", raising=False)
    monkeypatch.delenv("ENV", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.setenv("NODE_ENV", "development")
    assert is_production_runtime() is False
    monkeypatch.setenv("VERCEL_ENV", "production")
    assert is_production_runtime() is True
