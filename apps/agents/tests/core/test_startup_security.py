"""Startup security guards for checkpoint DB and internal API key."""

import pytest
from agents_app.server import is_production_runtime, validate_startup_security


def test_validate_startup_allows_local_without_key_or_db(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTS_ENV", raising=False)
    monkeypatch.delenv("ENV", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.setenv("NODE_ENV", "development")
    monkeypatch.setenv("AGENTS_REQUIRE_CHECKPOINT_DB", "")
    monkeypatch.setenv("AGENTS_REQUIRE_INTERNAL_API_KEY", "")
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "")
    monkeypatch.setenv("LANGGRAPH_CHECKPOINT_DATABASE_URL", "")
    validate_startup_security()


def test_validate_startup_requires_key_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTS_ENV", "production")
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "")
    monkeypatch.setenv("LANGGRAPH_CHECKPOINT_DATABASE_URL", "postgresql://localhost/db")
    with pytest.raises(RuntimeError, match="INTERNAL_API_KEY"):
        validate_startup_security()


def test_validate_startup_requires_checkpoint_db_in_production(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("AGENTS_ENV", "production")
    monkeypatch.setenv("INTERNAL_API_KEY", "secret")
    monkeypatch.setenv("LANGGRAPH_CHECKPOINT_DATABASE_URL", "")
    with pytest.raises(RuntimeError, match="LANGGRAPH_CHECKPOINT_DATABASE_URL"):
        validate_startup_security()


def test_is_production_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("AGENTS_ENV", raising=False)
    monkeypatch.delenv("ENV", raising=False)
    monkeypatch.delenv("VERCEL_ENV", raising=False)
    monkeypatch.setenv("NODE_ENV", "development")
    assert is_production_runtime() is False
    monkeypatch.setenv("VERCEL_ENV", "production")
    assert is_production_runtime() is True
