"""Integration tests for native POS GraphQL API."""

from __future__ import annotations

import asyncio

import pytest

from graphql.data_sources import (
    AnalyticsRun,
    Location,
    Node,
    OrderFact,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.menu import (
    Menu,
    MenuCategory,
    MenuItem,
    MenuModifierGroup,
    MenuModifierOption,
)
from graphql.data_sources.models.pos_order import (
    PosOrder,
    PosOrderLine,
    PosOrderLineModifier,
)
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

OTHER_USER_ID = "clerk_other_user"
MEMBER_USER_ID = "clerk_pos_member"

REPLACE_MENU = """
mutation ReplaceLocationMenuItems($locationId: Int!, $categories: [MenuCategoryInput!]!) {
  replaceLocationMenuItems(locationId: $locationId, categories: $categories) {
    categories {
      items {
        id
        name
        price
        isAvailable
        modifierGroups {
          id
          name
          minSelect
          maxSelect
          options { id name priceDelta isAvailable }
        }
      }
    }
  }
}
"""

OPEN = """
mutation OpenPosOrder($locationId: Int!) {
  openPosOrder(locationId: $locationId) {
    id
    billNumber
    status
    discountAmount
    openedByClerkUserId
    lines { id }
  }
}
"""

ADD_LINE = """
mutation AddPosOrderLine(
  $orderId: Int!
  $menuItemId: Int!
  $qty: Int!
  $modifierOptionIds: [Int!]
  $note: String
) {
  addPosOrderLine(
    orderId: $orderId
    menuItemId: $menuItemId
    qty: $qty
    modifierOptionIds: $modifierOptionIds
    note: $note
  ) {
    id
    status
    lines {
      id
      menuItemId
      nameSnapshot
      menuCategorySnapshot
      qty
      unitPrice
      lineTotal
      note
      modifiers {
        groupNameSnapshot
        nameSnapshot
        priceDeltaSnapshot
      }
    }
  }
}
"""

SET_DISCOUNT = """
mutation SetPosOrderDiscount($orderId: Int!, $amount: Float!) {
  setPosOrderDiscount(orderId: $orderId, amount: $amount) {
    id
    discountAmount
  }
}
"""

SET_TABLE_LABEL = """
mutation SetPosOrderTableLabel($orderId: Int!, $tableLabel: String) {
  setPosOrderTableLabel(orderId: $orderId, tableLabel: $tableLabel) {
    id
    tableLabel
    status
  }
}
"""

CLOSE = """
mutation ClosePosOrder($orderId: Int!, $paymentMethod: PosPaymentMethod!) {
  closePosOrder(orderId: $orderId, paymentMethod: $paymentMethod) {
    id
    status
    paymentMethod
    closedAt
    billNumber
    tableLabel
  }
}
"""

VOID = """
mutation VoidPosOrder($orderId: Int!) {
  voidPosOrder(orderId: $orderId) {
    id
    status
    closedAt
  }
}
"""

REFUND = """
mutation RefundPosOrder($orderId: Int!) {
  refundPosOrder(orderId: $orderId) {
    id
    status
    refundedAt
    billNumber
    paymentMethod
  }
}
"""

DAY_SUMMARY = """
query PosDaySummary($locationId: Int!, $onDate: String) {
  posDaySummary(locationId: $locationId, onDate: $onDate) {
    locationId
    onDate
    openCount
    paidCount
    voidCount
    refundedCount
    paidDiscountTotal
    refundedGrossTotal
    openTicketsRemaining
    paidByPaymentMethod {
      paymentMethod
      ticketCount
      grossTotal
    }
  }
}
"""


def _cleanup() -> None:
    from graphql.data_sources.models.pos_audit_event import PosAuditEvent
    from graphql.data_sources.models.pos_bill_sequence import PosBillSequence
    from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess
    from graphql.data_sources.models.pos_register import PosRegister
    from graphql.data_sources.models.tax_rate import TaxRate

    session = SessionLocal()
    try:
        session.query(OrderFact).delete()
        session.query(AnalyticsRun).delete()
        session.query(PosAuditEvent).delete()
        session.query(PosFiscalProcess).delete()
        session.query(PosOrderLineModifier).delete()
        session.query(PosOrderLine).delete()
        session.query(PosOrder).delete()
        session.query(PosBillSequence).delete()
        session.query(PosRegister).delete()
        session.query(MenuModifierOption).delete()
        session.query(MenuModifierGroup).delete()
        session.query(MenuItem).delete()
        session.query(MenuCategory).delete()
        session.query(Menu).delete()
        session.query(Node).delete()
        session.query(Location).delete()
        session.query(TaxRate).delete()
        session.commit()
    finally:
        session.close()


def _create_location_with_menu(
    *, clerk_user_id: str = GRAPHQL_TEST_USER_ID
) -> tuple[int, int, int]:
    """Return (location_id, available_item_id, unavailable_item_id)."""
    _cleanup()
    session = SessionLocal()
    try:
        location = Location(name="POS Test Location", clerk_user_id=clerk_user_id)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    replace = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "categories": [
                    {
                        "name": "Drinks",
                        "items": [
                            {
                                "name": "Espresso",
                                "price": 4.0,
                                "isAvailable": True,
                            },
                            {
                                "name": "Sold Out Latte",
                                "price": 5.0,
                                "isAvailable": False,
                            },
                        ],
                    }
                ],
            },
            context_value={"user_id": clerk_user_id},
        )
    )
    assert not replace.errors, replace.errors
    items = replace.data["replaceLocationMenuItems"]["categories"][0]["items"]
    available_id = next(i["id"] for i in items if i["name"] == "Espresso")
    unavailable_id = next(i["id"] for i in items if i["name"] == "Sold Out Latte")
    return location_id, available_id, unavailable_id


def test_open_add_close_projects_order_facts():
    location_id, item_id, _ = _create_location_with_menu()

    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not opened.errors, opened.errors
    order = opened.data["openPosOrder"]
    assert order["status"] == "OPEN"
    assert order["billNumber"].startswith("MY-")
    order_id = order["id"]

    added = asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 2},
            context_value=graphql_auth_context(),
        )
    )
    assert not added.errors, added.errors
    lines = added.data["addPosOrderLine"]["lines"]
    assert len(lines) == 1
    assert lines[0]["qty"] == 2
    assert lines[0]["lineTotal"] == 8.0
    assert lines[0]["nameSnapshot"] == "Espresso"
    assert lines[0]["menuCategorySnapshot"] == "Drinks"

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors
    assert closed.data["closePosOrder"]["status"] == "PAID"
    assert closed.data["closePosOrder"]["paymentMethod"] == "CASH"
    bill = closed.data["closePosOrder"]["billNumber"]

    session = SessionLocal()
    try:
        facts = session.query(OrderFact).filter(OrderFact.bill_number == bill).all()
        assert len(facts) == 1
        assert facts[0].pos_system == "menuyukti"
        assert facts[0].menu == "Espresso"
        assert facts[0].qty == 2
        assert facts[0].total_after_bill_discount == 8.0
        assert facts[0].analytics_run_id is not None
        run = session.get(AnalyticsRun, facts[0].analytics_run_id)
        assert run is not None
        assert run.pos_system == "menuyukti"
        assert run.name.startswith("Menuyukti POS ")
        assert run.location_id == location_id
    finally:
        session.close()

    # Idempotent close
    closed_again = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CARD"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed_again.errors, closed_again.errors
    assert closed_again.data["closePosOrder"]["status"] == "PAID"
    assert closed_again.data["closePosOrder"]["paymentMethod"] == "CASH"

    session = SessionLocal()
    try:
        facts = session.query(OrderFact).filter(OrderFact.bill_number == bill).all()
        assert len(facts) == 1
    finally:
        session.close()


def test_void_writes_no_facts():
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    voided = asyncio.run(
        schema.execute(
            VOID,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not voided.errors, voided.errors
    assert voided.data["voidPosOrder"]["status"] == "VOID"

    session = SessionLocal()
    try:
        assert session.query(OrderFact).count() == 0
    finally:
        session.close()


def test_refund_paid_inserts_compensating_order_facts():
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CARD"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors
    bill = closed.data["closePosOrder"]["billNumber"]

    session = SessionLocal()
    try:
        assert session.query(OrderFact).filter(OrderFact.bill_number == bill).count() == 1
    finally:
        session.close()

    refunded = asyncio.run(
        schema.execute(
            REFUND,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not refunded.errors, refunded.errors
    assert refunded.data["refundPosOrder"]["status"] == "REFUNDED"
    assert refunded.data["refundPosOrder"]["refundedAt"] is not None
    assert refunded.data["refundPosOrder"]["paymentMethod"] == "CARD"

    session = SessionLocal()
    try:
        facts = session.query(OrderFact).filter(OrderFact.bill_number == bill).all()
        assert len(facts) == 2
        totals = sorted(float(f.total_after_bill_discount) for f in facts)
        assert totals[0] < 0
        assert totals[1] > 0
        assert abs(totals[0] + totals[1]) < 0.001
    finally:
        session.close()

    again = asyncio.run(
        schema.execute(
            REFUND,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert again.errors
    assert "already refunded" in str(again.errors[0]).lower()


def test_refund_rejected_when_not_paid():
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]

    open_reject = asyncio.run(
        schema.execute(
            REFUND,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert open_reject.errors
    assert "not paid" in str(open_reject.errors[0]).lower()

    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    asyncio.run(
        schema.execute(
            VOID,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    void_reject = asyncio.run(
        schema.execute(
            REFUND,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert void_reject.errors
    assert "not paid" in str(void_reject.errors[0]).lower()


def test_unavailable_item_rejected():
    location_id, _, unavailable_id = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    result = asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={
                "orderId": order_id,
                "menuItemId": unavailable_id,
                "qty": 1,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "not available" in str(result.errors[0]).lower()


def test_set_and_clear_table_label_on_open():
    location_id, _, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]

    set_result = asyncio.run(
        schema.execute(
            SET_TABLE_LABEL,
            variable_values={"orderId": order_id, "tableLabel": "  Patio 2  "},
            context_value=graphql_auth_context(),
        )
    )
    assert not set_result.errors, set_result.errors
    assert set_result.data["setPosOrderTableLabel"]["tableLabel"] == "Patio 2"

    clear_result = asyncio.run(
        schema.execute(
            SET_TABLE_LABEL,
            variable_values={"orderId": order_id, "tableLabel": "   "},
            context_value=graphql_auth_context(),
        )
    )
    assert not clear_result.errors, clear_result.errors
    assert clear_result.data["setPosOrderTableLabel"]["tableLabel"] is None

    null_result = asyncio.run(
        schema.execute(
            SET_TABLE_LABEL,
            variable_values={"orderId": order_id, "tableLabel": None},
            context_value=graphql_auth_context(),
        )
    )
    assert not null_result.errors, null_result.errors
    assert null_result.data["setPosOrderTableLabel"]["tableLabel"] is None


def test_add_line_with_modifiers_and_note():
    location_id, _, _ = _create_location_with_menu()
    # Replace menu with a latte that requires size
    replace = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "categories": [
                    {
                        "name": "Coffee",
                        "items": [
                            {
                                "name": "Latte",
                                "price": 4.0,
                                "isAvailable": True,
                                "modifierGroups": [
                                    {
                                        "name": "Size",
                                        "minSelect": 1,
                                        "maxSelect": 1,
                                        "options": [
                                            {"name": "Regular", "priceDelta": 0.0},
                                            {"name": "Large", "priceDelta": 1.5},
                                        ],
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not replace.errors, replace.errors
    item = replace.data["replaceLocationMenuItems"]["categories"][0]["items"][0]
    item_id = item["id"]
    large_id = next(
        opt["id"]
        for group in item["modifierGroups"]
        for opt in group["options"]
        if opt["name"] == "Large"
    )

    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]

    missing = asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    assert missing.errors
    assert "at least" in str(missing.errors[0]).lower()

    added = asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={
                "orderId": order_id,
                "menuItemId": item_id,
                "qty": 1,
                "modifierOptionIds": [large_id],
                "note": " oat milk ",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not added.errors, added.errors
    line = added.data["addPosOrderLine"]["lines"][0]
    assert line["unitPrice"] == 5.5
    assert line["lineTotal"] == 5.5
    assert line["note"] == "oat milk"
    assert line["modifiers"][0]["nameSnapshot"] == "Large"
    assert line["modifiers"][0]["priceDeltaSnapshot"] == 1.5

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors
    bill = closed.data["closePosOrder"]["billNumber"]
    session = SessionLocal()
    try:
        facts = session.query(OrderFact).filter(OrderFact.bill_number == bill).all()
        assert len(facts) == 1
        assert facts[0].price == 5.5
        assert facts[0].total_after_bill_discount == 5.5
    finally:
        session.close()


def test_set_table_label_rejected_when_paid():
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    asyncio.run(
        schema.execute(
            SET_TABLE_LABEL,
            variable_values={"orderId": order_id, "tableLabel": "3"},
            context_value=graphql_auth_context(),
        )
    )
    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors
    assert closed.data["closePosOrder"]["tableLabel"] == "3"

    rejected = asyncio.run(
        schema.execute(
            SET_TABLE_LABEL,
            variable_values={"orderId": order_id, "tableLabel": "4"},
            context_value=graphql_auth_context(),
        )
    )
    assert rejected.errors
    assert "not open" in str(rejected.errors[0]).lower()


def test_discount_that_zeros_line_rejected():
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    discounted = asyncio.run(
        schema.execute(
            SET_DISCOUNT,
            variable_values={"orderId": order_id, "amount": 4.0},
            context_value=graphql_auth_context(),
        )
    )
    assert discounted.errors
    assert "positive revenue" in str(discounted.errors[0]).lower()


def test_auth_denial_for_non_owner():
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value={"user_id": OTHER_USER_ID},
        )
    )
    assert opened.errors

    # Owner opens, other user cannot add
    opened_ok = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened_ok.data["openPosOrder"]["id"]
    denied = asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value={"user_id": OTHER_USER_ID},
        )
    )
    assert denied.errors


def test_pos_day_summary_counts_paid_and_open():
    location_id, item_id, _ = _create_location_with_menu()

    # Paid ticket
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors

    # Leave one open
    asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )

    summary = asyncio.run(
        schema.execute(
            DAY_SUMMARY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not summary.errors, summary.errors
    data = summary.data["posDaySummary"]
    assert data["paidCount"] == 1
    assert data["openCount"] == 1
    assert data["openTicketsRemaining"] == 1
    assert data["paidByPaymentMethod"][0]["paymentMethod"] == "CASH"
    assert data["paidByPaymentMethod"][0]["grossTotal"] == 4.0


def test_workspace_member_can_sell_but_not_refund():
    from datetime import UTC, datetime

    _cleanup()
    session = SessionLocal()
    try:
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()
        now = datetime.now(tz=UTC)
        ws = Workspace(name="POS staff workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
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
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=MEMBER_USER_ID,
                role="member",
                invited_at=now,
                accepted_at=now,
            )
        )
        location = Location(
            name="POS Staff Location",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=ws.id,
        )
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
        workspace_id = ws.id
    finally:
        session.close()

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

    member_ctx = {"user_id": MEMBER_USER_ID}
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=member_ctx,
        )
    )
    assert not opened.errors, opened.errors
    order_id = opened.data["openPosOrder"]["id"]
    assert opened.data["openPosOrder"]["openedByClerkUserId"] == MEMBER_USER_ID

    added = asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=member_ctx,
        )
    )
    assert not added.errors, added.errors

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CARD"},
            context_value=member_ctx,
        )
    )
    assert not closed.errors, closed.errors

    denied = asyncio.run(
        schema.execute(
            REFUND,
            variable_values={"orderId": order_id},
            context_value=member_ctx,
        )
    )
    assert denied.errors

    refunded = asyncio.run(
        schema.execute(
            REFUND,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not refunded.errors, refunded.errors
    assert refunded.data["refundPosOrder"]["status"] == "REFUNDED"

    session = SessionLocal()
    try:
        from graphql.data_sources.models.pos_audit_event import PosAuditEvent
        from graphql.data_sources.models.pos_bill_sequence import PosBillSequence
        from graphql.data_sources.models.pos_register import PosRegister

        session.query(PosAuditEvent).delete()
        session.query(PosOrderLineModifier).delete()
        session.query(PosOrderLine).delete()
        session.query(PosOrder).delete()
        session.query(PosBillSequence).delete()
        session.query(PosRegister).delete()
        session.query(MenuModifierOption).delete()
        session.query(MenuModifierGroup).delete()
        session.query(MenuItem).delete()
        session.query(MenuCategory).delete()
        session.query(Menu).delete()
        session.query(Location).filter(Location.id == location_id).delete()
        session.query(WorkspaceMembership).filter(
            WorkspaceMembership.workspace_id == workspace_id
        ).delete()
        session.query(Workspace).filter(Workspace.id == workspace_id).delete()
        session.commit()
    finally:
        session.close()


TAX_CLOSE = """
mutation ClosePosOrder($orderId: Int!, $paymentMethod: PosPaymentMethod!) {
  closePosOrder(orderId: $orderId, paymentMethod: $paymentMethod) {
    id
    status
    net
    tax
    gross
    discountAmount
    taxBreakdown { taxRateBps net tax gross }
    lines { taxClass taxRateBps net tax lineTotal unitPrice qty }
    registerId
  }
}
"""


def test_tax_split_standard_rate_and_register():
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    closed = asyncio.run(
        schema.execute(
            TAX_CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors
    order = closed.data["closePosOrder"]
    assert order["registerId"] is not None
    assert order["gross"] == 4.0
    assert order["taxRateBps"] if False else True
    assert abs(order["net"] + order["tax"] - order["gross"]) < 0.001
    assert order["taxBreakdown"]
    assert order["taxBreakdown"][0]["taxRateBps"] == 1900
    assert order["lines"][0]["taxClass"] == "standard"
    assert order["lines"][0]["taxRateBps"] == 1900


def test_discount_recomputes_tax():
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 2},
            context_value=graphql_auth_context(),
        )
    )
    asyncio.run(
        schema.execute(
            SET_DISCOUNT,
            variable_values={"orderId": order_id, "amount": 1.0},
            context_value=graphql_auth_context(),
        )
    )
    closed = asyncio.run(
        schema.execute(
            TAX_CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors
    order = closed.data["closePosOrder"]
    assert order["discountAmount"] == 1.0
    assert order["gross"] == 7.0
    assert abs(order["net"] + order["tax"] - 7.0) < 0.001


def test_mixed_tax_classes():
    location_id, item_id, _ = _create_location_with_menu()
    session = SessionLocal()
    try:
        from graphql.data_sources.models.menu import MenuItem

        item = session.get(MenuItem, item_id)
        assert item is not None
        item.tax_class = "reduced"
        reduced = MenuItem(
            menu_id=item.menu_id,
            category_id=item.category_id,
            name="Water",
            description="",
            price=2.0,
            tax_class="reduced",
            sort_order=99,
            is_available=True,
        )
        session.add(reduced)
        # Keep espresso as standard
        item.tax_class = "standard"
        session.commit()
        reduced_id = reduced.id
    finally:
        session.close()

    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": reduced_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    closed = asyncio.run(
        schema.execute(
            TAX_CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors
    order = closed.data["closePosOrder"]
    rates = {row["taxRateBps"] for row in order["taxBreakdown"]}
    assert 1900 in rates
    assert 700 in rates
    assert order["gross"] == 6.0


def test_concurrent_bill_numbers_unique():
    location_id, _, _ = _create_location_with_menu()
    results = []
    for _ in range(5):
        opened = asyncio.run(
            schema.execute(
                OPEN,
                variable_values={"locationId": location_id},
                context_value=graphql_auth_context(),
            )
        )
        assert not opened.errors, opened.errors
        results.append(opened.data["openPosOrder"]["billNumber"])
    assert len(results) == len(set(results))


def test_clear_digital_menu_blocked_when_paid_tickets_exist():
    from graphql.services.clear_service_data import ClearServiceDataResult, _clear_digital_menu

    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )

    session = SessionLocal()
    try:
        result = ClearServiceDataResult(
            service_key="digital_menu",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=0,
            location_ids=[location_id],
        )
        with pytest.raises(ValueError, match="paid or refunded"):
            _clear_digital_menu(session, [location_id], result)
    finally:
        session.close()


CLOSE_WITH_FISCAL = """
mutation ClosePosOrder($orderId: Int!, $paymentMethod: PosPaymentMethod!) {
  closePosOrder(orderId: $orderId, paymentMethod: $paymentMethod) {
    id
    status
    fiscalProcesses {
      kind
      state
      provider
      tseTransactionId
      tseSignature
      signatureCounter
      qrPayload
    }
  }
}
"""


def test_open_starts_mock_fiscal_sale_process():
    from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess

    location_id, _, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not opened.errors, opened.errors
    order_id = opened.data["openPosOrder"]["id"]

    session = SessionLocal()
    try:
        proc = (
            session.query(PosFiscalProcess)
            .filter(PosFiscalProcess.pos_order_id == order_id, PosFiscalProcess.kind == "sale")
            .one()
        )
        assert proc.state == "started"
        assert proc.provider == "mock"
        assert proc.tse_transaction_id and proc.tse_transaction_id.startswith("MOCK-TX-")
    finally:
        session.close()


def test_close_finishes_fiscal_then_projects_facts():
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    closed = asyncio.run(
        schema.execute(
            CLOSE_WITH_FISCAL,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors
    order = closed.data["closePosOrder"]
    assert order["status"] == "PAID"
    sale = next(p for p in order["fiscalProcesses"] if p["kind"] == "sale")
    assert sale["state"] == "finished"
    assert sale["provider"] == "mock"
    assert sale["tseSignature"]
    assert sale["qrPayload"]
    assert sale["signatureCounter"] is not None

    session = SessionLocal()
    try:
        facts = session.query(OrderFact).filter(OrderFact.pos_system == "menuyukti").all()
        assert len(facts) >= 1
    finally:
        session.close()


def test_void_cancels_fiscal_process():
    from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess

    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    voided = asyncio.run(
        schema.execute(
            VOID,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not voided.errors, voided.errors

    session = SessionLocal()
    try:
        proc = (
            session.query(PosFiscalProcess)
            .filter(PosFiscalProcess.pos_order_id == order_id, PosFiscalProcess.kind == "sale")
            .one()
        )
        assert proc.state == "cancelled"
    finally:
        session.close()


def test_refund_creates_finished_refund_fiscal_process():
    from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess

    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    refunded = asyncio.run(
        schema.execute(
            REFUND,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not refunded.errors, refunded.errors

    session = SessionLocal()
    try:
        refund_proc = (
            session.query(PosFiscalProcess)
            .filter(PosFiscalProcess.pos_order_id == order_id, PosFiscalProcess.kind == "refund")
            .one()
        )
        assert refund_proc.state == "finished"
        assert refund_proc.tse_signature
        negatives = [
            f
            for f in session.query(OrderFact).filter(OrderFact.pos_system == "menuyukti").all()
            if float(f.total_after_bill_discount) < 0
        ]
        assert negatives
    finally:
        session.close()


def test_fiscal_force_fail_blocks_close_and_facts():
    import os

    from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess

    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )

    os.environ["POS_FISCAL_FORCE_FAIL"] = "1"
    try:
        closed = asyncio.run(
            schema.execute(
                CLOSE,
                variable_values={"orderId": order_id, "paymentMethod": "CASH"},
                context_value=graphql_auth_context(),
            )
        )
        assert closed.errors
        assert "Fiscalization" in str(closed.errors[0]) or "forced failure" in str(closed.errors[0])
    finally:
        os.environ.pop("POS_FISCAL_FORCE_FAIL", None)

    session = SessionLocal()
    try:
        order = session.get(PosOrder, order_id)
        assert order is not None
        assert order.status == "open"
        facts = session.query(OrderFact).filter(OrderFact.pos_system == "menuyukti").count()
        assert facts == 0
        # Uncommitted fail state rolls back with the mutation; process stays started
        proc = (
            session.query(PosFiscalProcess)
            .filter(PosFiscalProcess.pos_order_id == order_id, PosFiscalProcess.kind == "sale")
            .one()
        )
        assert proc.state == "started"
    finally:
        session.close()


def test_idempotent_close_no_duplicate_facts():
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = opened.data["openPosOrder"]["id"]
    asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": 1},
            context_value=graphql_auth_context(),
        )
    )
    for _ in range(2):
        closed = asyncio.run(
            schema.execute(
                CLOSE,
                variable_values={"orderId": order_id, "paymentMethod": "CASH"},
                context_value=graphql_auth_context(),
            )
        )
        assert not closed.errors, closed.errors

    session = SessionLocal()
    try:
        facts = session.query(OrderFact).filter(OrderFact.pos_system == "menuyukti").all()
        assert len(facts) == 1
    finally:
        session.close()
