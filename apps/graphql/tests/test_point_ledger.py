"""Point ledger: awards, digital-menu gate, guest queries."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import (
    Location,
    PointEarnRule,
    PointLedgerEntry,
    ServiceSubscription,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.analytics import AnalyticsRun, OrderFact
from graphql.data_sources.models.menu import Menu, MenuCategory, MenuItem
from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine
from graphql.schema import schema
from graphql.services.point_earn_rules import (
    ACTION_KEY_COMPLETE_ORDER,
    ACTION_KEY_OPEN_MENU_QR,
)
from graphql.services.pos_orders import PUBLIC_MENU_ORDER_NOTE
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_KEY_POINT_SYSTEM,
    SERVICE_STATUS_ACTIVE,
)
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

GUEST_USER_ID = "clerk_guest_points"
OTHER_GUEST_ID = "clerk_other_guest_points"

ACTIVATE = """
mutation Activate($locationId: Int!, $serviceKey: String!) {
  activateServiceSubscription(locationId: $locationId, serviceKey: $serviceKey) {
    id
    serviceKey
    status
  }
}
"""

UPSERT_RULES = """
mutation UpsertRules($locationId: Int!, $rules: [PointEarnRuleInput!]!) {
  upsertPointEarnRules(locationId: $locationId, rules: $rules) {
    actionKey
    points
    enabled
  }
}
"""

RECORD_EARN = """
mutation RecordEarn($locationId: Int!, $actionKey: String!) {
  recordPointEarnEvent(locationId: $locationId, actionKey: $actionKey) {
    awarded
    balance
  }
}
"""

SUBMIT_MENU_ORDER = """
mutation SubmitPublicMenuOrder(
  $locationId: Int!
  $lines: [PublicMenuOrderLineInput!]!
) {
  submitPublicMenuOrder(locationId: $locationId, lines: $lines) {
    id
    note
    openedByClerkUserId
  }
}
"""

OPEN_POS = """
mutation OpenPosOrder($locationId: Int!) {
  openPosOrder(locationId: $locationId) {
    id
    openedByClerkUserId
    note
  }
}
"""

ADD_LINE = """
mutation AddPosOrderLine($orderId: Int!, $menuItemId: Int!, $qty: Int!) {
  addPosOrderLine(orderId: $orderId, menuItemId: $menuItemId, qty: $qty) {
    id
  }
}
"""

CLOSE = """
mutation ClosePosOrder($orderId: Int!, $paymentMethod: PosPaymentMethod!) {
  closePosOrder(orderId: $orderId, paymentMethod: $paymentMethod) {
    id
    status
  }
}
"""

BALANCES = """
query MyBalances {
  myPointBalances {
    locationId
    locationName
    balance
  }
}
"""

ENTRIES = """
query MyEntries($limit: Int) {
  myPointEntries(limit: $limit) {
    id
    locationId
    amount
    actionKey
    label
  }
}
"""


def _clear(session) -> None:
    session.query(PointLedgerEntry).filter(
        PointLedgerEntry.clerk_user_id.in_([GUEST_USER_ID, OTHER_GUEST_ID, GRAPHQL_TEST_USER_ID])
    ).delete(synchronize_session=False)
    session.query(PosOrderLine).filter(
        PosOrderLine.pos_order_id.in_(
            session.query(PosOrder.id).filter(
                PosOrder.opened_by_clerk_user_id.in_(
                    [GUEST_USER_ID, OTHER_GUEST_ID, GRAPHQL_TEST_USER_ID]
                )
            )
        )
    ).delete(synchronize_session=False)
    session.query(PosOrder).filter(
        PosOrder.opened_by_clerk_user_id.in_([GUEST_USER_ID, OTHER_GUEST_ID, GRAPHQL_TEST_USER_ID])
    ).delete(synchronize_session=False)
    session.query(PointEarnRule).filter(
        PointEarnRule.location_id.in_(
            session.query(Location.id).filter(Location.clerk_user_id.in_([GRAPHQL_TEST_USER_ID]))
        )
    ).delete(synchronize_session=False)
    session.query(OrderFact).filter(
        OrderFact.analytics_run_id.in_(
            session.query(AnalyticsRun.id).filter(
                AnalyticsRun.location_id.in_(
                    session.query(Location.id).filter(
                        Location.clerk_user_id == GRAPHQL_TEST_USER_ID
                    )
                )
            )
        )
    ).delete(synchronize_session=False)
    session.query(AnalyticsRun).filter(
        AnalyticsRun.location_id.in_(
            session.query(Location.id).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID)
        )
    ).delete(synchronize_session=False)
    session.query(MenuItem).filter(
        MenuItem.menu_id.in_(
            session.query(Menu.id).filter(
                Menu.location_id.in_(
                    session.query(Location.id).filter(
                        Location.clerk_user_id == GRAPHQL_TEST_USER_ID
                    )
                )
            )
        )
    ).delete(synchronize_session=False)
    session.query(MenuCategory).filter(
        MenuCategory.menu_id.in_(
            session.query(Menu.id).filter(
                Menu.location_id.in_(
                    session.query(Location.id).filter(
                        Location.clerk_user_id == GRAPHQL_TEST_USER_ID
                    )
                )
            )
        )
    ).delete(synchronize_session=False)
    session.query(Menu).filter(
        Menu.location_id.in_(
            session.query(Location.id).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID)
        )
    ).delete(synchronize_session=False)
    session.query(ServiceSubscription).filter(
        ServiceSubscription.workspace_id.in_(
            session.query(Workspace.id).filter(
                Workspace.owner_clerk_user_id == GRAPHQL_TEST_USER_ID
            )
        )
    ).delete(synchronize_session=False)
    session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
    session.query(WorkspaceMembership).filter(
        WorkspaceMembership.clerk_user_id == GRAPHQL_TEST_USER_ID
    ).delete()
    session.query(Workspace).filter(Workspace.owner_clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
    session.commit()


@pytest.fixture
def points_venue():
    session = SessionLocal()
    try:
        _clear(session)
        ws = Workspace(
            name="Ledger WS",
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
            name="Ledger Cafe",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=ws.id,
            currency="EUR",
            public_slug="ledger-cafe",
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
            name="Soup",
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
    finally:
        session.close()

    yield {"location_id": lid, "menu_item_id": item_id}

    session = SessionLocal()
    try:
        _clear(session)
    finally:
        session.close()


def _activate_points(location_id: int) -> None:
    result = asyncio.run(
        schema.execute(
            ACTIVATE,
            variable_values={
                "locationId": location_id,
                "serviceKey": SERVICE_KEY_POINT_SYSTEM,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None, result.errors


def _enable_rules(location_id: int, *, open_pts: int = 10, order_pts: int = 25) -> None:
    result = asyncio.run(
        schema.execute(
            UPSERT_RULES,
            variable_values={
                "locationId": location_id,
                "rules": [
                    {
                        "actionKey": ACTION_KEY_OPEN_MENU_QR,
                        "points": open_pts,
                        "enabled": open_pts > 0,
                    },
                    {
                        "actionKey": ACTION_KEY_COMPLETE_ORDER,
                        "points": order_pts,
                        "enabled": order_pts > 0,
                    },
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None, result.errors


def test_open_menu_award_and_idempotent(points_venue):
    lid = points_venue["location_id"]
    _activate_points(lid)
    _enable_rules(lid, open_pts=10, order_pts=0)

    first = asyncio.run(
        schema.execute(
            RECORD_EARN,
            variable_values={"locationId": lid, "actionKey": ACTION_KEY_OPEN_MENU_QR},
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert first.errors is None, first.errors
    assert first.data["recordPointEarnEvent"]["awarded"] is True
    assert first.data["recordPointEarnEvent"]["balance"] == 10

    second = asyncio.run(
        schema.execute(
            RECORD_EARN,
            variable_values={"locationId": lid, "actionKey": ACTION_KEY_OPEN_MENU_QR},
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert second.errors is None, second.errors
    assert second.data["recordPointEarnEvent"]["awarded"] is False
    assert second.data["recordPointEarnEvent"]["balance"] == 10


def test_open_menu_noop_without_subscription(points_venue):
    lid = points_venue["location_id"]
    result = asyncio.run(
        schema.execute(
            RECORD_EARN,
            variable_values={"locationId": lid, "actionKey": ACTION_KEY_OPEN_MENU_QR},
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors is None, result.errors
    assert result.data["recordPointEarnEvent"]["awarded"] is False
    assert result.data["recordPointEarnEvent"]["balance"] == 0


def test_open_menu_noop_when_rule_disabled(points_venue):
    lid = points_venue["location_id"]
    _activate_points(lid)
    _enable_rules(lid, open_pts=0, order_pts=0)

    result = asyncio.run(
        schema.execute(
            RECORD_EARN,
            variable_values={"locationId": lid, "actionKey": ACTION_KEY_OPEN_MENU_QR},
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors is None, result.errors
    assert result.data["recordPointEarnEvent"]["awarded"] is False


def test_complete_order_awards_digital_menu_guest(points_venue):
    lid = points_venue["location_id"]
    item_id = points_venue["menu_item_id"]
    _activate_points(lid)
    _enable_rules(lid, open_pts=0, order_pts=25)

    submitted = asyncio.run(
        schema.execute(
            SUBMIT_MENU_ORDER,
            variable_values={
                "locationId": lid,
                "lines": [{"menuItemId": item_id, "qty": 1}],
            },
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert submitted.errors is None, submitted.errors
    order_id = int(submitted.data["submitPublicMenuOrder"]["id"])
    assert submitted.data["submitPublicMenuOrder"]["note"] == PUBLIC_MENU_ORDER_NOTE

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert closed.errors is None, closed.errors
    assert closed.data["closePosOrder"]["status"] == "PAID"

    balances = asyncio.run(schema.execute(BALANCES, context_value={"user_id": GUEST_USER_ID}))
    assert balances.errors is None, balances.errors
    rows = balances.data["myPointBalances"]
    assert len(rows) == 1
    assert rows[0]["locationId"] == lid
    assert rows[0]["balance"] == 25

    # Idempotent: second close does not double-credit
    closed_again = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert closed_again.errors is None, closed_again.errors

    balances2 = asyncio.run(schema.execute(BALANCES, context_value={"user_id": GUEST_USER_ID}))
    assert balances2.data["myPointBalances"][0]["balance"] == 25


def test_staff_pos_close_does_not_award(points_venue):
    lid = points_venue["location_id"]
    item_id = points_venue["menu_item_id"]
    _activate_points(lid)
    _enable_rules(lid, open_pts=0, order_pts=40)

    opened = asyncio.run(
        schema.execute(
            OPEN_POS,
            variable_values={"locationId": lid},
            context_value=graphql_auth_context(),
        )
    )
    assert opened.errors is None, opened.errors
    order_id = int(opened.data["openPosOrder"]["id"])
    assert opened.data["openPosOrder"]["note"] is None

    added = asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    assert added.errors is None, added.errors

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CARD"},
            context_value=graphql_auth_context(),
        )
    )
    assert closed.errors is None, closed.errors

    owner_balances = asyncio.run(schema.execute(BALANCES, context_value=graphql_auth_context()))
    assert owner_balances.errors is None
    assert owner_balances.data["myPointBalances"] == []


def test_my_points_queries_scoped_to_caller(points_venue):
    lid = points_venue["location_id"]
    _activate_points(lid)
    _enable_rules(lid, open_pts=7, order_pts=0)

    asyncio.run(
        schema.execute(
            RECORD_EARN,
            variable_values={"locationId": lid, "actionKey": ACTION_KEY_OPEN_MENU_QR},
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    asyncio.run(
        schema.execute(
            RECORD_EARN,
            variable_values={"locationId": lid, "actionKey": ACTION_KEY_OPEN_MENU_QR},
            context_value={"user_id": OTHER_GUEST_ID},
        )
    )

    guest = asyncio.run(schema.execute(BALANCES, context_value={"user_id": GUEST_USER_ID}))
    other = asyncio.run(schema.execute(BALANCES, context_value={"user_id": OTHER_GUEST_ID}))
    assert guest.data["myPointBalances"][0]["balance"] == 7
    assert other.data["myPointBalances"][0]["balance"] == 7

    entries = asyncio.run(
        schema.execute(
            ENTRIES,
            variable_values={"limit": 10},
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert entries.errors is None
    assert len(entries.data["myPointEntries"]) == 1
    assert entries.data["myPointEntries"][0]["actionKey"] == ACTION_KEY_OPEN_MENU_QR
    assert entries.data["myPointEntries"][0]["amount"] == 7

    anon = asyncio.run(schema.execute(BALANCES, context_value={}))
    assert anon.errors is None
    assert anon.data["myPointBalances"] == []


def test_record_earn_rejects_complete_order_action(points_venue):
    lid = points_venue["location_id"]
    _activate_points(lid)
    result = asyncio.run(
        schema.execute(
            RECORD_EARN,
            variable_values={"locationId": lid, "actionKey": ACTION_KEY_COMPLETE_ORDER},
            context_value={"user_id": GUEST_USER_ID},
        )
    )
    assert result.errors
    assert "Unsupported" in result.errors[0].message
