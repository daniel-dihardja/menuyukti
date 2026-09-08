"""Tests for deleteLocation mutation."""

from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime, time

import pytest
from graphql.data_sources import (
    AnalyticsRun,
    CalendarEntry,
    InventoryCatalogItem,
    InventoryStock,
    InventoryStockMovement,
    Location,
    LocationManualBriefInput,
    LocationMenuItemCogs,
    LocationOpeningHour,
    MenuItemCogs,
    Node,
    OrderFact,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

OTHER_USER_ID = "clerk_other_delete_location"

DELETE_LOCATION = """
mutation DeleteLocation($id: ID!) {
  deleteLocation(id: $id)
}
"""


@pytest.fixture
def delete_location_workspace():
    session = SessionLocal()
    try:
        now = datetime.now(tz=UTC)
        ws = Workspace(name="Delete Location WS", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
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
        loc = Location(
            name="Delete Me",
            workspace_id=ws.id,
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            currency="IDR",
        )
        session.add(loc)
        session.flush()

        node = Node(
            name="root",
            path="/root",
            node_type="location",
            location_id=loc.id,
        )
        session.add(node)
        session.flush()
        loc.node_id = node.id

        session.add(
            LocationOpeningHour(
                location_id=loc.id,
                day_of_week="monday",
                open_time=time(8, 0),
                close_time=time(18, 0),
            )
        )
        session.add(
            LocationManualBriefInput(
                location_id=loc.id,
                quick_profile={"venueConcepts": ["cafe"]},
            )
        )
        session.add(
            LocationMenuItemCogs(
                location_id=loc.id,
                menu="Latte",
                cogs=1.5,
                currency="IDR",
            )
        )
        session.add(
            CalendarEntry(
                location_id=loc.id,
                title="Event",
                entry_date="2026-09-01",
                entry_time="10:00",
            )
        )

        run = AnalyticsRun(
            name="seed-run",
            filename="seed.xlsx",
            pos_system="esb",
            location_id=loc.id,
        )
        session.add(run)
        session.flush()
        session.add(
            OrderFact(
                analytics_run_id=run.id,
                bill_number="B1",
                menu="Latte",
                qty=1,
                price=5.0,
                total_after_bill_discount=5.0,
                order_time=now,
                menu_category="Drinks",
                menu_category_detail="Coffee",
                pos_system="esb",
            )
        )
        session.add(
            MenuItemCogs(
                analytics_run_id=run.id,
                menu="Latte",
                cogs=1.5,
            )
        )

        catalog = InventoryCatalogItem(
            workspace_id=ws.id,
            name="Oat milk",
            package_size=1.0,
            package_unit="L",
            storage_zone="cooler",
        )
        session.add(catalog)
        session.flush()
        stock = InventoryStock(
            location_id=loc.id,
            catalog_item_id=catalog.id,
            on_hand=2.0,
        )
        session.add(stock)
        session.flush()
        session.add(
            InventoryStockMovement(
                location_id=loc.id,
                catalog_item_id=catalog.id,
                stock_id=stock.id,
                direction="in",
                quantity=2.0,
                occurred_on=date(2026, 9, 1),
            )
        )

        session.commit()
        payload = {
            "workspace_id": ws.id,
            "location_id": loc.id,
            "node_id": node.id,
            "run_id": run.id,
            "catalog_id": catalog.id,
        }
    finally:
        session.close()

    yield payload

    session = SessionLocal()
    try:
        session.query(MenuItemCogs).filter(
            MenuItemCogs.analytics_run_id == payload["run_id"]
        ).delete()
        session.query(OrderFact).filter(OrderFact.analytics_run_id == payload["run_id"]).delete()
        session.query(AnalyticsRun).filter(AnalyticsRun.id == payload["run_id"]).delete()
        session.query(InventoryStockMovement).filter(
            InventoryStockMovement.location_id == payload["location_id"]
        ).delete()
        session.query(InventoryStock).filter(
            InventoryStock.location_id == payload["location_id"]
        ).delete()
        session.query(InventoryCatalogItem).filter(
            InventoryCatalogItem.id == payload["catalog_id"]
        ).delete()
        session.query(CalendarEntry).filter(
            CalendarEntry.location_id == payload["location_id"]
        ).delete()
        session.query(LocationMenuItemCogs).filter(
            LocationMenuItemCogs.location_id == payload["location_id"]
        ).delete()
        session.query(LocationOpeningHour).filter(
            LocationOpeningHour.location_id == payload["location_id"]
        ).delete()
        session.query(LocationManualBriefInput).filter(
            LocationManualBriefInput.location_id == payload["location_id"]
        ).delete()
        loc = session.get(Location, payload["location_id"])
        if loc is not None:
            loc.node_id = None
            session.flush()
        session.query(Node).filter(Node.id == payload["node_id"]).delete()
        session.query(Location).filter(Location.id == payload["location_id"]).delete()
        session.query(WorkspaceMembership).filter(
            WorkspaceMembership.workspace_id == payload["workspace_id"]
        ).delete()
        session.query(Workspace).filter(Workspace.id == payload["workspace_id"]).delete()
        session.commit()
    finally:
        session.close()


def test_delete_location_removes_dependents_keeps_catalog(delete_location_workspace):
    location_id = delete_location_workspace["location_id"]
    result = asyncio.run(
        schema.execute(
            DELETE_LOCATION,
            variable_values={"id": str(location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    assert result.data["deleteLocation"] is True

    session = SessionLocal()
    try:
        assert session.get(Location, location_id) is None
        assert session.get(AnalyticsRun, delete_location_workspace["run_id"]) is None
        assert (
            session.query(OrderFact)
            .filter(OrderFact.analytics_run_id == delete_location_workspace["run_id"])
            .count()
            == 0
        )
        assert (
            session.query(InventoryStock).filter(InventoryStock.location_id == location_id).count()
            == 0
        )
        assert (
            session.query(InventoryStockMovement)
            .filter(InventoryStockMovement.location_id == location_id)
            .count()
            == 0
        )
        assert (
            session.query(CalendarEntry).filter(CalendarEntry.location_id == location_id).count()
            == 0
        )
        catalog = session.get(InventoryCatalogItem, delete_location_workspace["catalog_id"])
        assert catalog is not None
        node = session.get(Node, delete_location_workspace["node_id"])
        assert node is not None
        assert node.location_id is None
    finally:
        session.close()


def test_delete_location_idempotent(delete_location_workspace):
    location_id = delete_location_workspace["location_id"]
    first = asyncio.run(
        schema.execute(
            DELETE_LOCATION,
            variable_values={"id": str(location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not first.errors, first.errors
    second = asyncio.run(
        schema.execute(
            DELETE_LOCATION,
            variable_values={"id": str(location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not second.errors, second.errors
    assert second.data["deleteLocation"] is True


def test_delete_location_denied_for_outsider(delete_location_workspace):
    location_id = delete_location_workspace["location_id"]
    result = asyncio.run(
        schema.execute(
            DELETE_LOCATION,
            variable_values={"id": str(location_id)},
            context_value={"user_id": OTHER_USER_ID},
        )
    )
    assert result.errors
    assert "Access denied" in str(result.errors[0])

    session = SessionLocal()
    try:
        assert session.get(Location, location_id) is not None
    finally:
        session.close()
