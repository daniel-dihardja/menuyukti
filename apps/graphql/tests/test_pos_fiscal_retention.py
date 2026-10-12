"""Fiscal retention: clear/delete paths with RESTRICT fiscal FK."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import SessionLocal
from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess
from graphql.data_sources.models.pos_order import PosOrder
from graphql.schema import schema
from graphql.services.clear_service_data import ClearServiceDataResult, _clear_digital_menu
from graphql.services.location import delete_location_row
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from graphql.tests.test_pos_orders import (
    ADD_LINE,
    CLOSE,
    OPEN,
    VOID,
    _create_location_with_menu,
)
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError


def test_clear_open_tickets_deletes_fiscal_then_orders() -> None:
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not opened.errors, opened.errors
    order_id = int(opened.data["openPosOrder"]["id"])

    session = SessionLocal()
    try:
        fiscal_before = (
            session.query(PosFiscalProcess)
            .filter(PosFiscalProcess.pos_order_id == order_id)
            .count()
        )
        assert fiscal_before >= 1

        result = ClearServiceDataResult(
            service_key="digital_menu",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=0,
            location_ids=[location_id],
        )
        _clear_digital_menu(session, [location_id], result)
        session.commit()

        assert result.pos_orders_deleted >= 1
        assert session.get(PosOrder, order_id) is None
        assert (
            session.query(PosFiscalProcess)
            .filter(PosFiscalProcess.pos_order_id == order_id)
            .count()
            == 0
        )
    finally:
        session.close()


def test_clear_blocked_when_paid_keeps_fiscal() -> None:
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = int(opened.data["openPosOrder"]["id"])
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
        finished = (
            session.query(PosFiscalProcess)
            .filter(
                PosFiscalProcess.pos_order_id == order_id,
                PosFiscalProcess.state == "finished",
            )
            .count()
        )
        assert finished >= 1
    finally:
        session.close()


def test_delete_location_clears_open_void_fiscal() -> None:
    location_id, _, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = int(opened.data["openPosOrder"]["id"])
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
        assert delete_location_row(session, location_id) is True
        session.commit()
        assert (
            session.query(PosFiscalProcess)
            .filter(PosFiscalProcess.pos_order_id == order_id)
            .count()
            == 0
        )
    finally:
        session.close()


def test_sqlite_restrict_blocks_paid_order_delete_when_fk_enforced() -> None:
    """When SQLite FK enforcement is on, finished fiscal RESTRICT blocks order wipe."""
    location_id, item_id, _ = _create_location_with_menu()
    opened = asyncio.run(
        schema.execute(
            OPEN,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    order_id = int(opened.data["openPosOrder"]["id"])
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
        session.execute(text("PRAGMA foreign_keys=ON"))
        with pytest.raises(IntegrityError):
            session.query(PosOrder).filter(PosOrder.id == order_id).delete(
                synchronize_session=False
            )
            session.flush()
        session.rollback()
    finally:
        session.close()
