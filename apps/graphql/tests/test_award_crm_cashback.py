"""Tests for awardCrmCashback staff mutation."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from graphql.data_sources import (
    CrmApp,
    CrmAuditEvent,
    CrmCashbackEntry,
    CrmCustomer,
    CrmDevice,
    CrmEnrollmentToken,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_CREATE_APP = """
mutation CreateCrmApp($title: String!) {
  createCrmApp(title: $title) {
    id
    appId
  }
}
"""

_AWARD = """
mutation AwardCrmCashback($customerId: UUID!, $amount: Int!, $label: String) {
  awardCrmCashback(customerId: $customerId, amount: $amount, label: $label) {
    id
    customerId
    amount
    label
    createdAt
  }
}
"""

OTHER_USER_ID = "clerk_other_cashback_award_user"


@pytest.fixture
def award_workspace_id():
    session = SessionLocal()
    try:
        session.query(CrmCashbackEntry).delete()
        session.query(CrmAuditEvent).delete()
        session.query(CrmDevice).delete()
        session.query(CrmCustomer).delete()
        session.query(CrmEnrollmentToken).delete()
        session.query(CrmApp).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(
            name="CRM cashback award workspace", owner_clerk_user_id=GRAPHQL_TEST_USER_ID
        )
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
        session.commit()
        session.refresh(ws)
        wid = ws.id
    finally:
        session.close()
    yield wid
    session = SessionLocal()
    try:
        session.query(CrmCashbackEntry).delete()
        session.query(CrmAuditEvent).delete()
        session.query(CrmDevice).delete()
        session.query(CrmCustomer).delete()
        session.query(CrmEnrollmentToken).delete()
        session.query(CrmApp).filter(CrmApp.workspace_id == wid).delete()
        session.query(WorkspaceMembership).filter(WorkspaceMembership.workspace_id == wid).delete()
        session.query(Workspace).filter(Workspace.id == wid).delete()
        session.commit()
    finally:
        session.close()


def _execute(query: str, variable_values: dict | None = None, context_value: dict | None = None):
    return asyncio.run(
        schema.execute(
            query,
            variable_values=variable_values or {},
            context_value=context_value if context_value is not None else graphql_auth_context(),
        )
    )


def _create_app(title: str = "Award App") -> dict:
    created = _execute(_CREATE_APP, {"title": title})
    assert created.errors is None
    return created.data["createCrmApp"]


def _seed_customer(app_id: int) -> str:
    session = SessionLocal()
    try:
        customer = CrmCustomer(crm_app_id=app_id, phone_e164="+491701112233")
        session.add(customer)
        session.commit()
        return str(customer.id)
    finally:
        session.close()


def test_award_cashback_happy_path(award_workspace_id: int):
    app = _create_app()
    customer_id = _seed_customer(app["id"])

    result = _execute(
        _AWARD,
        {"customerId": customer_id, "amount": 15_000, "label": "  Visit bonus  "},
    )
    assert result.errors is None
    entry = result.data["awardCrmCashback"]
    assert entry["customerId"] == customer_id
    assert entry["amount"] == 15_000
    assert entry["label"] == "Visit bonus"
    assert UUID(entry["id"])
    assert entry["createdAt"]

    session = SessionLocal()
    try:
        rows = (
            session.query(CrmCashbackEntry)
            .filter(CrmCashbackEntry.customer_id == UUID(customer_id))
            .all()
        )
        assert len(rows) == 1
        assert rows[0].amount == 15_000
        events = (
            session.query(CrmAuditEvent).filter(CrmAuditEvent.event_type == "cashback_award").all()
        )
        assert len(events) == 1
        assert "amount:15000" in (events[0].detail or "")
    finally:
        session.close()


def test_award_rejects_zero_amount(award_workspace_id: int):
    app = _create_app()
    customer_id = _seed_customer(app["id"])

    zero = _execute(_AWARD, {"customerId": customer_id, "amount": 0})
    assert zero.errors is not None
    assert "amount must be a non-zero integer" in str(zero.errors[0])


def test_award_allows_negative_amount(award_workspace_id: int):
    app = _create_app()
    customer_id = _seed_customer(app["id"])

    result = _execute(
        _AWARD,
        {"customerId": customer_id, "amount": -15_000, "label": "Redeemed at till"},
    )
    assert result.errors is None
    entry = result.data["awardCrmCashback"]
    assert entry["amount"] == -15_000
    assert entry["label"] == "Redeemed at till"


def test_award_rejects_unknown_customer(award_workspace_id: int):
    result = _execute(_AWARD, {"customerId": str(uuid4()), "amount": 1000})
    assert result.errors is not None
    assert "CRM customer not found" in str(result.errors[0])


def test_award_denied_for_non_member(award_workspace_id: int):
    app = _create_app()
    customer_id = _seed_customer(app["id"])

    denied = _execute(
        _AWARD,
        {"customerId": customer_id, "amount": 1000},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert denied.errors is not None
    assert "Not allowed" in str(denied.errors[0])
