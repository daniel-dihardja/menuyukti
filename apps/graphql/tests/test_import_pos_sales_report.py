"""Tests for importPosSalesReport (batch POS → analytics run)."""

from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime, timedelta

from graphql.data_sources import AnalyticsRun, OrderFact, SessionLocal
from graphql.data_sources.models.pos_order import PosOrder
from graphql.schema import schema
from graphql.tests.auth_context import graphql_auth_context
from graphql.tests.test_pos_orders import (
    ADD_LINE,
    CLOSE,
    OPEN,
    VOID,
    _create_location_with_menu,
)

IMPORT = """
mutation ImportPosSalesReport($locationId: ID!, $startDate: Date!, $endDate: Date!) {
  importPosSalesReport(locationId: $locationId, startDate: $startDate, endDate: $endDate) {
    analyticsRunId
    name
    orderCount
    lineCount
  }
}
"""


def _open_add_close(location_id: int, item_id: int, *, qty: int = 1) -> tuple[int, str]:
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not opened.errors, opened.errors
    order_id = opened.data["openPosOrder"]["id"]
    added = asyncio.run(
        schema.execute(
            ADD_LINE,
            variable_values={"orderId": order_id, "menuItemId": item_id, "qty": qty},
            context_value=graphql_auth_context(),
        )
    )
    assert not added.errors, added.errors
    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"orderId": order_id, "paymentMethod": "CASH"},
            context_value=graphql_auth_context(),
        )
    )
    assert not closed.errors, closed.errors
    return order_id, closed.data["closePosOrder"]["billNumber"]


def test_import_pos_sales_report_creates_new_run():
    location_id, item_id, _ = _create_location_with_menu()
    _order_id, bill = _open_add_close(location_id, item_id, qty=2)

    today = date.today()
    result = asyncio.run(
        schema.execute(
            IMPORT,
            variable_values={
                "locationId": str(location_id),
                "startDate": today.isoformat(),
                "endDate": today.isoformat(),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["importPosSalesReport"]
    assert payload["orderCount"] == 1
    assert payload["lineCount"] == 1
    assert payload["name"] == f"Menuyukti POS {today.isoformat()}–{today.isoformat()}"
    import_run_id = int(payload["analyticsRunId"])

    session = SessionLocal()
    try:
        import_facts = (
            session.query(OrderFact).filter(OrderFact.analytics_run_id == import_run_id).all()
        )
        assert len(import_facts) == 1
        assert import_facts[0].bill_number == bill
        assert import_facts[0].menu == "Espresso"
        assert import_facts[0].qty == 2
        assert import_facts[0].pos_system == "menuyukti"

        # Live monthly projection still present (separate run).
        all_for_bill = session.query(OrderFact).filter(OrderFact.bill_number == bill).all()
        assert len(all_for_bill) == 2
        run_ids = {f.analytics_run_id for f in all_for_bill}
        assert import_run_id in run_ids
        assert len(run_ids) == 2
    finally:
        session.close()


def test_import_pos_sales_report_allows_duplicates():
    location_id, item_id, _ = _create_location_with_menu()
    _open_add_close(location_id, item_id)

    today = date.today()
    variables = {
        "locationId": str(location_id),
        "startDate": today.isoformat(),
        "endDate": today.isoformat(),
    }
    first = asyncio.run(
        schema.execute(IMPORT, variable_values=variables, context_value=graphql_auth_context())
    )
    assert not first.errors, first.errors
    second = asyncio.run(
        schema.execute(IMPORT, variable_values=variables, context_value=graphql_auth_context())
    )
    assert not second.errors, second.errors

    first_id = int(first.data["importPosSalesReport"]["analyticsRunId"])
    second_id = int(second.data["importPosSalesReport"]["analyticsRunId"])
    assert first_id != second_id

    session = SessionLocal()
    try:
        named = (
            session.query(AnalyticsRun)
            .filter(
                AnalyticsRun.location_id == location_id,
                AnalyticsRun.name == f"Menuyukti POS {today.isoformat()}–{today.isoformat()}",
            )
            .all()
        )
        assert len(named) == 2
    finally:
        session.close()


def test_import_pos_sales_report_empty_range_errors():
    location_id, item_id, _ = _create_location_with_menu()
    _open_add_close(location_id, item_id)

    past = date.today() - timedelta(days=30)
    result = asyncio.run(
        schema.execute(
            IMPORT,
            variable_values={
                "locationId": str(location_id),
                "startDate": past.isoformat(),
                "endDate": past.isoformat(),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "No paid POS tickets" in result.errors[0].message


def test_import_pos_sales_report_ignores_void_and_open():
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
            VOID,
            variable_values={"orderId": order_id},
            context_value=graphql_auth_context(),
        )
    )

    # Leave another ticket open (not paid).
    asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )

    today = date.today()
    result = asyncio.run(
        schema.execute(
            IMPORT,
            variable_values={
                "locationId": str(location_id),
                "startDate": today.isoformat(),
                "endDate": today.isoformat(),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "No paid POS tickets" in result.errors[0].message


def test_import_pos_sales_report_start_after_end_errors():
    location_id, _item_id, _ = _create_location_with_menu()
    today = date.today()
    result = asyncio.run(
        schema.execute(
            IMPORT,
            variable_values={
                "locationId": str(location_id),
                "startDate": today.isoformat(),
                "endDate": (today - timedelta(days=1)).isoformat(),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "startDate must be on or before endDate" in result.errors[0].message


def test_import_pos_sales_report_respects_closed_at_window():
    location_id, item_id, _ = _create_location_with_menu()
    order_id, _bill = _open_add_close(location_id, item_id)

    # Move closed_at outside today's window so import of "today" finds nothing.
    session = SessionLocal()
    try:
        order = session.get(PosOrder, order_id)
        assert order is not None
        order.closed_at = datetime(2020, 1, 15, 12, 0, tzinfo=UTC)
        session.commit()
    finally:
        session.close()

    today = date.today()
    result = asyncio.run(
        schema.execute(
            IMPORT,
            variable_values={
                "locationId": str(location_id),
                "startDate": today.isoformat(),
                "endDate": today.isoformat(),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "No paid POS tickets" in result.errors[0].message

    # Import the historical day succeeds.
    historical = asyncio.run(
        schema.execute(
            IMPORT,
            variable_values={
                "locationId": str(location_id),
                "startDate": "2020-01-15",
                "endDate": "2020-01-15",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not historical.errors, historical.errors
    assert historical.data["importPosSalesReport"]["orderCount"] == 1
