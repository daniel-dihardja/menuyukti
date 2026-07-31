"""Pytest fixtures and env defaults for agents tests."""

import os

import pytest

# Chat graph compiles at app lifespan and instantiates ChatOpenAI; avoid requiring a real key in CI.
os.environ.setdefault("AI_GATEWAY_API_KEY", "test-key-agents-ci-not-for-production")

# Force in-memory checkpointer in tests (local .env may set a Postgres URL).
# Must be set before ``agents_app.server`` is imported so load_dotenv does not win.
os.environ["LANGGRAPH_CHECKPOINT_DATABASE_URL"] = ""

# Keep the inbound API-key gate off unless a test monkeypatches a real key.
# (load_dotenv in server.py may otherwise load GRAPHQL_INTERNAL_API_KEY from a local .env.)
os.environ["INTERNAL_API_KEY"] = ""
os.environ["GRAPHQL_INTERNAL_API_KEY"] = ""

# Avoid production startup hard-fails during TestClient lifespan.
for _prod_key in ("AGENTS_ENV", "ENV", "VERCEL_ENV", "NODE_ENV"):
    if os.environ.get(_prod_key, "").strip().lower() == "production":
        os.environ[_prod_key] = "test"
os.environ["AGENTS_REQUIRE_CHECKPOINT_DB"] = ""
os.environ["AGENTS_REQUIRE_INTERNAL_API_KEY"] = ""


@pytest.fixture(autouse=True)
def _clear_agents_inbound_api_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    """Default: no inbound key required. Middleware tests override via monkeypatch."""
    monkeypatch.setenv("INTERNAL_API_KEY", "")
    monkeypatch.setenv("GRAPHQL_INTERNAL_API_KEY", "")
    monkeypatch.setenv("LANGGRAPH_CHECKPOINT_DATABASE_URL", "")
    monkeypatch.setenv("AGENTS_REQUIRE_CHECKPOINT_DB", "")
    monkeypatch.setenv("AGENTS_REQUIRE_INTERNAL_API_KEY", "")
    for key in ("AGENTS_ENV", "ENV", "VERCEL_ENV"):
        monkeypatch.delenv(key, raising=False)
    if os.environ.get("NODE_ENV", "").strip().lower() == "production":
        monkeypatch.setenv("NODE_ENV", "test")
