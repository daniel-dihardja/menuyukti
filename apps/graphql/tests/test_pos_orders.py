"""Integration tests for native POS GraphQL API."""

from __future__ import annotations

import asyncio

from graphql.data_sources import AnalyticsRun, Location, Node, OrderFact, SessionLocal
from graphql.data_sources.models.menu import Menu, MenuCategory, MenuItem
from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

OTHER_USER_ID = "clerk_other_user"

REPLACE_MENU = """
mutation ReplaceLocationMenuItems($locationId: Int!, $categories: [MenuCategoryInput!]!) {
  replaceLocationMenuItems(locationId: $locationId, categories: $categories) {
    categories {
      items { id name price isAvailable }
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
    lines { id }
  }
}
"""

ADD_LINE = """
mutation AddPosOrderLine($orderId: Int!, $menuItemId: Int!, $qty: Int!) {
  addPosOrderLine(orderId: $orderId, menuItemId: $menuItemId, qty: $qty) {
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


def _cleanup() -> None:
    session = SessionLocal()
    try:
        session.query(OrderFact).delete()
        session.query(AnalyticsRun).delete()
        session.query(PosOrderLine).delete()
        session.query(PosOrder).delete()
        session.query(MenuItem).delete()
        session.query(MenuCategory).delete()
        session.query(Menu).delete()
        session.query(Node).delete()
        session.query(Location).delete()
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


def test_refund_paid_deletes_order_facts():
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
        assert session.query(OrderFact).filter(OrderFact.bill_number == bill).count() == 0
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
    asyncio.run(
        schema.execute(
            SET_DISCOUNT,
            variable_values={"orderId": order_id, "amount": 4.0},
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
    assert closed.errors
    assert "positive revenue" in str(closed.errors[0]).lower()


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
