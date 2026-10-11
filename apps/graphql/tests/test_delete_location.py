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
    PosOrder,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.pos_audit_event import PosAuditEvent
from graphql.data_sources.models.pos_bill_sequence import PosBillSequence
from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess
from graphql.data_sources.models.pos_order import PosOrderLine, PosOrderLineModifier
from graphql.data_sources.models.pos_register import PosRegister
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

OTHER_USER_ID = "clerk_other_delete_location"

DELETE_LOCATION = """
mutation DeleteLocation($id: ID!) {
  deleteLocation(id: $id)
}
"""

REPLACE_MENU = """
mutation ReplaceLocationMenuItems($locationId: Int!, $categories: [MenuCategoryInput!]!) {
  replaceLocationMenuItems(locationId: $locationId, categories: $categories) {
    categories { items { id name } }
  }
}
"""

OPEN_POS = """
mutation OpenPosOrder($locationId: Int!) {
  openPosOrder(locationId: $locationId) { id }
}
"""

ADD_POS_LINE = """
mutation AddPosOrderLine($orderId: Int!, $menuItemId: Int!, $qty: Int!) {
  addPosOrderLine(orderId: $orderId, menuItemId: $menuItemId, qty: $qty) { id }
}
"""

CLOSE_POS = """
mutation ClosePosOrder($orderId: Int!, $paymentMethod: PosPaymentMethod!) {
  closePosOrder(orderId: $orderId, paymentMethod: $paymentMethod) { id status }
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
        location_id = payload["location_id"]
        session.query(PosAuditEvent).filter(PosAuditEvent.location_id == location_id).delete(
            synchronize_session=False
        )
        order_ids = [
            int(row[0])
            for row in session.query(PosOrder.id).filter(PosOrder.location_id == location_id).all()
        ]
        if order_ids:
            session.query(PosFiscalProcess).filter(
                PosFiscalProcess.pos_order_id.in_(order_ids)
            ).delete(synchronize_session=False)
            line_ids = [
                int(row[0])
                for row in session.query(PosOrderLine.id)
                .filter(PosOrderLine.pos_order_id.in_(order_ids))
                .all()
            ]
            if line_ids:
                session.query(PosOrderLineModifier).filter(
                    PosOrderLineModifier.pos_order_line_id.in_(line_ids)
                ).delete(synchronize_session=False)
                session.query(PosOrderLine).filter(PosOrderLine.id.in_(line_ids)).delete(
                    synchronize_session=False
                )
            session.query(PosOrder).filter(PosOrder.id.in_(order_ids)).delete(
                synchronize_session=False
            )
        session.query(PosBillSequence).filter(PosBillSequence.location_id == location_id).delete(
            synchronize_session=False
        )
        session.query(PosRegister).filter(PosRegister.location_id == location_id).delete(
            synchronize_session=False
        )

        run_ids = [
            int(rid)
            for (rid,) in session.query(AnalyticsRun.id)
            .filter(AnalyticsRun.location_id == location_id)
            .all()
        ]
        if run_ids:
            session.query(MenuItemCogs).filter(MenuItemCogs.analytics_run_id.in_(run_ids)).delete(
                synchronize_session=False
            )
            session.query(OrderFact).filter(OrderFact.analytics_run_id.in_(run_ids)).delete(
                synchronize_session=False
            )
            session.query(AnalyticsRun).filter(AnalyticsRun.id.in_(run_ids)).delete(
                synchronize_session=False
            )

        session.query(InventoryStockMovement).filter(
            InventoryStockMovement.location_id == location_id
        ).delete()
        session.query(InventoryStock).filter(InventoryStock.location_id == location_id).delete()
        session.query(InventoryCatalogItem).filter(
            InventoryCatalogItem.id == payload["catalog_id"]
        ).delete()
        session.query(CalendarEntry).filter(CalendarEntry.location_id == location_id).delete()
        session.query(LocationMenuItemCogs).filter(
            LocationMenuItemCogs.location_id == location_id
        ).delete()
        session.query(LocationOpeningHour).filter(
            LocationOpeningHour.location_id == location_id
        ).delete()
        session.query(LocationManualBriefInput).filter(
            LocationManualBriefInput.location_id == location_id
        ).delete()
        loc = session.get(Location, location_id)
        if loc is not None:
            loc.node_id = None
            session.flush()
        session.query(Node).filter(Node.id == payload["node_id"]).delete()
        session.query(Location).filter(Location.id == location_id).delete()
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


def test_delete_location_blocked_when_paid_pos_tickets_exist(delete_location_workspace):
    location_id = delete_location_workspace["location_id"]

    replace = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "categories": [
                    {
                        "name": "Drinks",
                        "items": [{"name": "Espresso", "price": 4.0, "isAvailable": True}],
                    }
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not replace.errors, replace.errors
    item_id = replace.data["replaceLocationMenuItems"]["categories"][0]["items"][0]["id"]

    opened = asyncio.run(
        schema.execute(
            OPEN_POS,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not opened.errors, opened.errors
    order_id = opened.data["openPosOrder"]["id"]

    added = asyncio.run(
        schema.execute(
            ADD_POS_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    assert not added.errors, added.errors

    closed = asyncio.run(
        schema.execute(
            CLOSE_POS,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors
    assert closed.data["closePosOrder"]["status"] == "PAID"

    result = asyncio.run(
        schema.execute(
            DELETE_LOCATION,
            variable_values={"id": str(location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "paid or refunded" in str(result.errors[0])

    session = SessionLocal()
    try:
        assert session.get(Location, location_id) is not None
        order = session.get(PosOrder, order_id)
        assert order is not None
        assert order.status == "paid"
    finally:
        session.close()
