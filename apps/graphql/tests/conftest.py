"""Pytest configuration and fixtures for GraphQL integration tests.

Sets DATABASE_URL before any import of graphql.data_sources so the test DB
is used. Provides session-scoped DB lifecycle (init/teardown).
"""

import os
from pathlib import Path

# Must set before any import of graphql.data_sources (engine is created at import time)
TEST_DB = Path(__file__).resolve().parent.parent / "test.db"
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{TEST_DB}"

import pytest


@pytest.fixture(scope="session", autouse=True)
def _graphql_test_db():
    """Initialize and tear down the test database for the session."""
    from graphql.data_sources import drop_db, init_db

    drop_db()
    init_db()
    yield
    drop_db()
