"""Tests for ingestDevData staff mutation."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

import pytest
from graphql.data_sources import (
    InventoryCatalogItem,
    Location,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.scripts.dev_seed_inventar import reset_inventar, seed_inventar
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

INGEST = """
mutation IngestDevData($targetClerkUserId: String!, $scope: String!) {
  ingestDevData(targetClerkUserId: $targetClerkUserId, scope: $scope) {
    scope
    clerkUserId
    workspaceId
    inventarCleared
    inventarCatalogItems
    inventarStockRows
  }
}
"""


@pytest.fixture
def seeded_workspace():
    seed_user = f"clerk_ingest_dev_data_{uuid.uuid4().hex[:12]}"
    session = SessionLocal()
    try:
        now = datetime.now(tz=UTC)
        ws = Workspace(name="Ingest Dev Data WS", owner_clerk_user_id=seed_user)
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=seed_user,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        loc = Location(
            name="Warung Sunda Lembur",
            city="Jakarta",
            country="Indonesia",
            currency="IDR",
            workspace_id=ws.id,
            clerk_user_id=seed_user,
        )
        session.add(loc)
        session.flush()
        reset_inventar(session, ws.id)
        seed_inventar(session, ws, loc, clerk_user_id=seed_user)
        session.commit()
        yield {
            "workspace_id": ws.id,
            "location_id": loc.id,
            "clerk_user_id": seed_user,
        }
    finally:
        session.close()


def test_ingest_dev_data_requires_auth():
    result = asyncio.run(
        schema.execute(
            INGEST,
            variable_values={
                "targetClerkUserId": "clerk_unused",
                "scope": "clear-inventar",
            },
            context_value={},
        )
    )
    assert result.errors
    assert "authenticated" in str(result.errors[0]).lower()


def test_ingest_dev_data_blocked_in_production(monkeypatch, seeded_workspace):
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.delenv("ALLOW_DEV_DATA_INGEST", raising=False)

    result = asyncio.run(
        schema.execute(
            INGEST,
            variable_values={
                "targetClerkUserId": seeded_workspace["clerk_user_id"],
                "scope": "clear-inventar",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "ALLOW_DEV_DATA_INGEST" in str(result.errors[0])


def test_ingest_dev_data_clear_inventar(seeded_workspace):
    result = asyncio.run(
        schema.execute(
            INGEST,
            variable_values={
                "targetClerkUserId": seeded_workspace["clerk_user_id"],
                "scope": "clear-inventar",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["ingestDevData"]
    assert payload["inventarCleared"] is True
    assert payload["workspaceId"] == str(seeded_workspace["workspace_id"])
    assert payload["clerkUserId"] == seeded_workspace["clerk_user_id"]

    session = SessionLocal()
    try:
        assert (
            session.query(InventoryCatalogItem)
            .filter(InventoryCatalogItem.workspace_id == seeded_workspace["workspace_id"])
            .count()
            == 0
        )
        assert session.get(Location, seeded_workspace["location_id"]) is not None
    finally:
        session.close()


def test_ingest_dev_data_allowed_in_production_with_flag(monkeypatch, seeded_workspace):
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.setenv("ALLOW_DEV_DATA_INGEST", "1")

    result = asyncio.run(
        schema.execute(
            INGEST,
            variable_values={
                "targetClerkUserId": seeded_workspace["clerk_user_id"],
                "scope": "clear-inventar",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    assert result.data["ingestDevData"]["inventarCleared"] is True


def test_ingest_dev_data_rejects_invalid_scope():
    result = asyncio.run(
        schema.execute(
            INGEST,
            variable_values={"targetClerkUserId": GRAPHQL_TEST_USER_ID, "scope": "nope"},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "scope" in str(result.errors[0]).lower()
