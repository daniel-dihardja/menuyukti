"""Tests for submitPublicMenuOrder (guest digital-menu ordering)."""

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
from graphql.schema import schema
from graphql.services.pos_orders import PUBLIC_MENU_ORDER_NOTE
from graphql.tests.pos_cleanup import clear_location_dependents
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_STATUS_ACTIVE,
)
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

GUEST_USER_ID = "clerk_guest_diner"

_SUBMIT = """
mutation SubmitPublicMenuOrder(
  $locationId: Int!
  $lines: [PublicMenuOrderLineInput!]!
  $fulfillmentMode: PosFulfillmentMode!
  $tableLabel: String
) {
  submitPublicMenuOrder(
    locationId: $locationId
    lines: $lines
    fulfillmentMode: $fulfillmentMode
    tableLabel: $tableLabel
  ) {
    id
    locationId
    billNumber
    status
    note
    tableLabel
    fulfillmentMode
    prepStatus
    openedByClerkUserId
    lines {
      menuItemId
      nameSnapshot
      qty
      unitPrice
      lineTotal
    }
  }
}
"""


@pytest.fixture
def published_menu_location():
    """Yield (location_id, available_item_id, unavailable_item_id)."""
    session = SessionLocal()
    try:
        ws = Workspace(
            name="Guest Order WS",
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
            name="Guest Order Loc",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=ws.id,
            currency="EUR",
            public_slug="guest-order-cafe",
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
        available = MenuItem(
            menu_id=menu.id,
            category_id=cat.id,
            name="Nasi Goreng",
            description="",
            price=12.5,
            sort_order=0,
            is_available=True,
        )
        unavailable = MenuItem(
            menu_id=menu.id,
            category_id=cat.id,
            name="Sold Out",
            description="",
            price=9.0,
            sort_order=1,
            is_available=False,
        )
        session.add_all([available, unavailable])
        session.commit()
        session.refresh(loc)
        session.refresh(available)
        session.refresh(unavailable)
        lid = loc.id
        available_id = available.id
        unavailable_id = unavailable.id
        wid = ws.id
    finally:
        session.close()

    yield lid, available_id, unavailable_id

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


def test_guest_can_submit_dine_in_public_menu_order(published_menu_location):
    location_id, item_id, _unavailable = published_menu_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values={
                "locationId": location_id,
                "lines": [{"menuItemId": item_id, "qty": 2}],
                "fulfillmentMode": "DINE_IN",
                "tableLabel": "T12",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors is None, result.errors
    order = result.data["submitPublicMenuOrder"]
    assert order["locationId"] == location_id
    assert order["status"] == "OPEN"
    assert order["note"] == PUBLIC_MENU_ORDER_NOTE
    assert order["tableLabel"] == "T12"
    assert order["fulfillmentMode"] == "DINE_IN"
    assert order["prepStatus"] == "RECEIVED"
    assert order["openedByClerkUserId"] == GUEST_USER_ID
    assert order["billNumber"]
    assert len(order["lines"]) == 1
    assert order["lines"][0]["menuItemId"] == item_id
    assert order["lines"][0]["qty"] == 2
    assert order["lines"][0]["nameSnapshot"] == "Nasi Goreng"
    assert order["lines"][0]["lineTotal"] == 25.0


def test_guest_can_submit_pickup_public_menu_order(published_menu_location):
    location_id, item_id, _ = published_menu_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values={
                "locationId": location_id,
                "lines": [{"menuItemId": item_id, "qty": 1}],
                "fulfillmentMode": "PICKUP",
                "tableLabel": "ignored-table",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors is None, result.errors
    order = result.data["submitPublicMenuOrder"]
    assert order["fulfillmentMode"] == "PICKUP"
    assert order["prepStatus"] == "RECEIVED"
    assert order["tableLabel"] is None
    assert order["note"] == PUBLIC_MENU_ORDER_NOTE


def test_dine_in_requires_table_label(published_menu_location):
    location_id, item_id, _ = published_menu_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values={
                "locationId": location_id,
                "lines": [{"menuItemId": item_id, "qty": 1}],
                "fulfillmentMode": "DINE_IN",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors
    assert "table_label is required" in result.errors[0].message


def test_submit_requires_auth(published_menu_location):
    location_id, item_id, _ = published_menu_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values={
                "locationId": location_id,
                "lines": [{"menuItemId": item_id, "qty": 1}],
                "fulfillmentMode": "PICKUP",
            },
            context_value={},
        )
    )
    assert result.errors
    assert "Missing authenticated user" in result.errors[0].message


def test_submit_rejected_when_menu_unpublished(published_menu_location):
    location_id, item_id, _ = published_menu_location
    session = SessionLocal()
    try:
        menu = session.query(Menu).filter(Menu.location_id == location_id).one()
        menu.public_enabled = False
        session.commit()
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values={
                "locationId": location_id,
                "lines": [{"menuItemId": item_id, "qty": 1}],
                "fulfillmentMode": "PICKUP",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors
    assert "not published" in result.errors[0].message


def test_submit_rejected_for_unavailable_item(published_menu_location):
    location_id, _, unavailable_id = published_menu_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values={
                "locationId": location_id,
                "lines": [{"menuItemId": unavailable_id, "qty": 1}],
                "fulfillmentMode": "PICKUP",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors
    assert "not available" in result.errors[0].message.lower()


def test_submit_rejected_for_empty_lines(published_menu_location):
    location_id, _, _ = published_menu_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values={
                "locationId": location_id,
                "lines": [],
                "fulfillmentMode": "PICKUP",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors
    assert "At least one line" in result.errors[0].message


def test_owner_can_still_submit_as_guest_path(published_menu_location):
    """Owner using the guest mutation is allowed (any signed-in Clerk user)."""
    location_id, item_id, _ = published_menu_location
    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values={
                "locationId": location_id,
                "lines": [{"menuItemId": item_id, "qty": 1}],
                "fulfillmentMode": "PICKUP",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None, result.errors
    assert result.data["submitPublicMenuOrder"]["openedByClerkUserId"] == GRAPHQL_TEST_USER_ID


def test_submit_rejected_when_pickup_disabled(published_menu_location):
    location_id, item_id, _ = published_menu_location
    session = SessionLocal()
    try:
        menu = session.query(Menu).filter(Menu.location_id == location_id).one()
        menu.allow_pickup = False
        menu.allow_dine_in = True
        session.commit()
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values={
                "locationId": location_id,
                "lines": [{"menuItemId": item_id, "qty": 1}],
                "fulfillmentMode": "PICKUP",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors
    assert "pickup fulfillment is not enabled" in result.errors[0].message


def test_submit_rejected_when_dine_in_disabled(published_menu_location):
    location_id, item_id, _ = published_menu_location
    session = SessionLocal()
    try:
        menu = session.query(Menu).filter(Menu.location_id == location_id).one()
        menu.allow_dine_in = False
        menu.allow_pickup = True
        session.commit()
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _SUBMIT,
            variable_values={
                "locationId": location_id,
                "lines": [{"menuItemId": item_id, "qty": 1}],
                "fulfillmentMode": "DINE_IN",
                "tableLabel": "T1",
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors
    assert "dine_in fulfillment is not enabled" in result.errors[0].message
