"""Shared inventar fixtures for GraphQL tests."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from graphql.data_sources import (
    InventoryCatalogItem,
    InventoryStock,
    InventoryStockMovement,
    Location,
    LocationArea,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID


@pytest.fixture
def inventar_workspace_and_location():
    session = SessionLocal()
    try:
        session.query(InventoryStockMovement).delete()
        session.query(InventoryStock).delete()
        session.query(InventoryCatalogItem).delete()
        session.query(LocationArea).delete()
        session.query(Location).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(name="Inventar WS", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=GRAPHQL_TEST_USER_ID,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        location = Location(
            name="Main cafe",
            workspace_id=ws.id,
            clerk_user_id=GRAPHQL_TEST_USER_ID,
        )
        session.add(location)
        session.commit()
        session.refresh(ws)
        session.refresh(location)
        payload = {"workspace_id": ws.id, "location_id": location.id}
    finally:
        session.close()
    yield payload
    session = SessionLocal()
    try:
        session.query(InventoryStockMovement).delete()
        session.query(InventoryStock).delete()
        session.query(InventoryCatalogItem).delete()
        session.query(LocationArea).delete()
        session.query(Location).filter(Location.workspace_id == payload["workspace_id"]).delete()
        session.query(WorkspaceMembership).filter(
            WorkspaceMembership.workspace_id == payload["workspace_id"]
        ).delete()
        session.query(Workspace).filter(Workspace.id == payload["workspace_id"]).delete()
        session.commit()
    finally:
        session.close()


@pytest.fixture
def inventar_two_locations(inventar_workspace_and_location):
    session = SessionLocal()
    try:
        second = Location(
            name="Second cafe",
            workspace_id=inventar_workspace_and_location["workspace_id"],
            clerk_user_id=GRAPHQL_TEST_USER_ID,
        )
        session.add(second)
        session.commit()
        session.refresh(second)
        second_id = second.id
    finally:
        session.close()
    yield {
        **inventar_workspace_and_location,
        "location_id_b": second_id,
    }
    session = SessionLocal()
    try:
        session.query(InventoryStockMovement).filter(
            InventoryStockMovement.location_id == second_id
        ).delete()
        session.query(InventoryStock).filter(InventoryStock.location_id == second_id).delete()
        session.query(LocationArea).filter(LocationArea.location_id == second_id).delete()
        session.query(Location).filter(Location.id == second_id).delete()
        session.commit()
    finally:
        session.close()
