"""Tests for digital-menu prep_status advance + guest publicMenuOrder."""

from __future__ import annotations

import asyncio

import pytest

from graphql.data_sources import (
    Location,
    ServiceSubscription,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.menu import Menu, MenuCategory, MenuItem
from graphql.data_sources.models.pos_order import PosOrder
from graphql.schema import schema
from graphql.services.pos_order_constants import (
    PREP_DELIVERED,
    PREP_PICKED_UP,
    PREP_PREPARING,
    PREP_READY,
    PREP_RECEIVED,
    PREP_SERVED,
    next_prep_status,
)
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_STATUS_ACTIVE,
)
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from graphql.tests.pos_cleanup import clear_location_dependents

GUEST_USER_ID = "clerk_guest_prep"
OTHER_GUEST_ID = "clerk_other_guest"

_SUBMIT = """
mutation SubmitPublicMenuOrder(
  $locationId: Int!
  $lines: [PublicMenuOrderLineInput!]!
  $fulfillmentMode: PosFulfillmentMode!
  $tableLabel: String
  $deliveryAddress: String
  $deliveryPhone: String
) {
  submitPublicMenuOrder(
    locationId: $locationId
    lines: $lines
    fulfillmentMode: $fulfillmentMode
    tableLabel: $tableLabel
    deliveryAddress: $deliveryAddress
    deliveryPhone: $deliveryPhone
  ) {
    id
    prepStatus
    fulfillmentMode
  }
}
"""

_ADVANCE = """
mutation AdvancePrep($orderId: Int!) {
  advancePosOrderPrepStatus(orderId: $orderId) {
    id
    prepStatus
  }
}
"""

_PUBLIC = """
query PublicMenuOrder($orderId: Int!) {
  publicMenuOrder(orderId: $orderId) {
    id
    billNumber
    status
    prepStatus
    fulfillmentMode
    tableLabel
  }
}
"""

_OPEN = """
mutation Open($locationId: Int!) {
  openPosOrder(locationId: $locationId) {
    id
    prepStatus
    note
  }
}
"""

_VOID = """
mutation Void($orderId: Int!) {
  voidPosOrder(orderId: $orderId) {
    id
    status
  }
}
"""


@pytest.fixture
def published_menu_location():
    session = SessionLocal()
    try:
        ws = Workspace(
            name="Prep Status WS",
            owner_clerk_user_id=GRAPHQL_TEST_USER_ID,
            plan=WORKSPACE_PLAN_PRO,
        )
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=GRAPHQL_TEST_USER_ID,
                role="owner",
            )
        )
        loc = Location(
            name="Prep Status Loc",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=ws.id,
            currency="EUR",
            public_slug="prep-status-cafe",
        )
        session.add(loc)
        session.flush()
        session.add(
            ServiceSubscription(
                workspace_id=ws.id,
                location_id=loc.id,
                service_key=SERVICE_KEY_DIGITAL_MENU,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        menu = Menu(location_id=loc.id, title="", public_enabled=True)
        session.add(menu)
        session.flush()
        cat = MenuCategory(menu_id=menu.id, name="Mains", sort_order=0)
        session.add(cat)
        session.flush()
        item = MenuItem(
            menu_id=menu.id,
            category_id=cat.id,
            name="Sate",
            description="",
            price=8.0,
            sort_order=0,
            is_available=True,
        )
        session.add(item)
        session.commit()
        session.refresh(loc)
        session.refresh(item)
        lid = loc.id
        item_id = item.id
        wid = ws.id
    finally:
        session.close()

    yield lid, item_id

    session = SessionLocal()
    try:
        clear_location_dependents(session, [lid])
        session.query(MenuItem).filter(
            MenuItem.menu_id.in_(session.query(Menu.id).filter(Menu.location_id == lid))
        ).delete(synchronize_session=False)
        session.query(MenuCategory).filter(
            MenuCategory.menu_id.in_(session.query(Menu.id).filter(Menu.location_id == lid))
        ).delete(synchronize_session=False)
        session.query(Menu).filter(Menu.location_id == lid).delete()
        session.query(ServiceSubscription).filter(ServiceSubscription.location_id == lid).delete()
        session.query(Location).filter(Location.id == lid).delete()
        session.query(WorkspaceMembership).filter(WorkspaceMembership.workspace_id == wid).delete()
        session.query(Workspace).filter(Workspace.id == wid).delete()
        session.commit()
    finally:
        session.close()


def test_next_prep_status_helpers():
    assert next_prep_status(PREP_RECEIVED, "dine_in") == PREP_PREPARING
    assert next_prep_status(PREP_PREPARING, "pickup") == PREP_READY
    assert next_prep_status(PREP_READY, "dine_in") == PREP_SERVED
    assert next_prep_status(PREP_READY, "pickup") == PREP_PICKED_UP
    assert next_prep_status(PREP_READY, "delivery") == PREP_DELIVERED
    with pytest.raises(ValueError, match="terminal"):
        next_prep_status(PREP_SERVED, "dine_in")
    with pytest.raises(ValueError, match="terminal"):
        next_prep_status(PREP_DELIVERED, "delivery")
    with pytest.raises(ValueError, match="not set"):
        next_prep_status(None, "dine_in")


def _submit(
    location_id: int,
    item_id: int,
    mode: str,
    table: str | None = None,
    *,
    delivery_address: str | None = None,
    delivery_phone: str | None = None,
) -> int:
    variables: dict = {
        "locationId": location_id,
        "lines": [{"menuItemId": item_id, "qty": 1}],
        "fulfillmentMode": mode,
    }
    if table is not None:
        variables["tableLabel"] = table
    if delivery_address is not None:
        variables["deliveryAddress"] = delivery_address
    if delivery_phone is not None:
        variables["deliveryPhone"] = delivery_phone
    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values=variables,
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors is None, result.errors
    assert result.data["submitPublicMenuOrder"]["prepStatus"] == "RECEIVED"
    return int(result.data["submitPublicMenuOrder"]["id"])


def test_advance_dine_in_through_served(published_menu_location):
    location_id, item_id = published_menu_location
    order_id = _submit(location_id, item_id, "DINE_IN", "T3")
    expected = ["PREPARING", "READY", "SERVED"]
    for status in expected:
        result = asyncio.run(
            schema.execute(
                _ADVANCE,
                variable_values={"orderId": order_id},
                context_value=graphql_auth_context(),
            )
        )
        assert result.errors is None, result.errors
        assert result.data["advancePosOrderPrepStatus"]["prepStatus"] == status

    result = asyncio.run(
        schema.execute(
            _ADVANCE,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "terminal" in result.errors[0].message


def test_advance_pickup_through_picked_up(published_menu_location):
    location_id, item_id = published_menu_location
    order_id = _submit(location_id, item_id, "PICKUP")
    for status in ["PREPARING", "READY", "PICKED_UP"]:
        result = asyncio.run(
            schema.execute(
                _ADVANCE,
                variable_values={"orderId": order_id},
                context_value=graphql_auth_context(),
            )
        )
        assert result.errors is None, result.errors
        assert result.data["advancePosOrderPrepStatus"]["prepStatus"] == status


def test_advance_delivery_through_delivered(published_menu_location):
    location_id, item_id = published_menu_location
    session = SessionLocal()
    try:
        menu = session.query(Menu).filter(Menu.location_id == location_id).one()
        menu.allow_delivery = True
        session.commit()
    finally:
        session.close()

    order_id = _submit(
        location_id,
        item_id,
        "DELIVERY",
        delivery_address="Home 1",
        delivery_phone="+49170",
    )
    for status in ["PREPARING", "READY", "DELIVERED"]:
        result = asyncio.run(
            schema.execute(
                _ADVANCE,
                variable_values={"orderId": order_id},
                context_value=graphql_auth_context(),
            )
        )
        assert result.errors is None, result.errors
        assert result.data["advancePosOrderPrepStatus"]["prepStatus"] == status


def test_cannot_advance_cashier_ticket(published_menu_location):
    location_id, _ = published_menu_location
    opened = asyncio.run(
        schema.execute(
            _OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert opened.errors is None, opened.errors
    assert opened.data["openPosOrder"]["prepStatus"] is None
    order_id = int(opened.data["openPosOrder"]["id"])

    result = asyncio.run(
        schema.execute(
            _ADVANCE,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "digital-menu" in result.errors[0].message


def test_cannot_advance_voided_digital_menu_order(published_menu_location):
    location_id, item_id = published_menu_location
    order_id = _submit(location_id, item_id, "PICKUP")
    voided = asyncio.run(
        schema.execute(
            _VOID,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert voided.errors is None, voided.errors
    assert voided.data["voidPosOrder"]["status"] == "VOID"

    result = asyncio.run(
        schema.execute(
            _ADVANCE,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "void" in result.errors[0].message.lower()


def test_cannot_advance_without_digital_menu_note(published_menu_location):
    """fulfillment_mode alone is not enough — note must be digital_menu."""
    location_id, _ = published_menu_location
    opened = asyncio.run(
        schema.execute(
            _OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert opened.errors is None, opened.errors
    order_id = int(opened.data["openPosOrder"]["id"])

    session = SessionLocal()
    try:
        order = session.get(PosOrder, order_id)
        assert order is not None
        order.fulfillment_mode = "pickup"
        order.prep_status = "received"
        order.note = None
        session.commit()
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _ADVANCE,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "digital-menu" in result.errors[0].message


def test_guest_can_poll_own_order(published_menu_location):
    location_id, item_id = published_menu_location
    order_id = _submit(location_id, item_id, "PICKUP")
    result = asyncio.run(
        schema.execute(
            _PUBLIC,
            variable_values={"orderId": order_id},
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors is None, result.errors
    order = result.data["publicMenuOrder"]
    assert order["id"] == order_id
    assert order["prepStatus"] == "RECEIVED"
    assert order["fulfillmentMode"] == "PICKUP"


def test_guest_cannot_poll_other_users_order(published_menu_location):
    location_id, item_id = published_menu_location
    order_id = _submit(location_id, item_id, "PICKUP")
    result = asyncio.run(
        schema.execute(
            _PUBLIC,
            variable_values={"orderId": order_id},
            context_value={"user_id": OTHER_GUEST_ID},
        )
    )
    assert result.errors is None, result.errors
    assert result.data["publicMenuOrder"] is None


def test_unauthenticated_guest_poll_returns_null(published_menu_location):
    location_id, item_id = published_menu_location
    order_id = _submit(location_id, item_id, "PICKUP")
    result = asyncio.run(
        schema.execute(
            _PUBLIC,
            variable_values={"orderId": order_id},
            context_value={},
        )
    )
    assert result.errors is None, result.errors
    assert result.data["publicMenuOrder"] is None
