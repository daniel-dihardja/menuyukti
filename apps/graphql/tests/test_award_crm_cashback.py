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

_UPDATE_APP = """
mutation UpdateCrmApp(
  $id: Int!
  $title: String!
  $cashbackThresholdAmount: Int
  $cashbackPercent: Int
) {
  updateCrmApp(
    id: $id
    title: $title
    cashbackThresholdAmount: $cashbackThresholdAmount
    cashbackPercent: $cashbackPercent
  ) {
    id
    cashbackThresholdAmount
    cashbackPercent
  }
}
"""

_AWARD = """
mutation AwardCrmCashback(
  $customerId: UUID!
  $paymentAmount: Int
  $redeemAmount: Int
  $label: String
) {
  awardCrmCashback(
    customerId: $customerId
    paymentAmount: $paymentAmount
    redeemAmount: $redeemAmount
    label: $label
  ) {
    id
    customerId
    amount
    paymentAmount
    cashbackPercent
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


def _configure_cashback(app_id: int, title: str, threshold: int, percent: int) -> None:
    updated = _execute(
        _UPDATE_APP,
        {
            "id": app_id,
            "title": title,
            "cashbackThresholdAmount": threshold,
            "cashbackPercent": percent,
        },
    )
    assert updated.errors is None


def _seed_customer(app_id: int) -> str:
    session = SessionLocal()
    try:
        customer = CrmCustomer(crm_app_id=app_id, phone_e164="+491701112233")
        session.add(customer)
        session.commit()
        return str(customer.id)
    finally:
        session.close()


def test_award_from_payment_happy_path(award_workspace_id: int):
    app = _create_app()
    _configure_cashback(app["id"], "Award App", 100_000, 10)
    customer_id = _seed_customer(app["id"])

    result = _execute(
        _AWARD,
        {"customerId": customer_id, "paymentAmount": 100_000, "label": "  Visit  "},
    )
    assert result.errors is None
    entry = result.data["awardCrmCashback"]
    assert entry["customerId"] == customer_id
    assert entry["amount"] == 10_000
    assert entry["paymentAmount"] == 100_000
    assert entry["cashbackPercent"] == 10
    assert entry["label"] == "Visit"
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
        assert rows[0].amount == 10_000
        assert rows[0].payment_amount == 100_000
        assert rows[0].cashback_percent == 10
        events = (
            session.query(CrmAuditEvent).filter(CrmAuditEvent.event_type == "cashback_award").all()
        )
        assert len(events) == 1
        assert "mode:award" in (events[0].detail or "")
        assert "credit:10000" in (events[0].detail or "")
    finally:
        session.close()


def test_award_floors_percent(award_workspace_id: int):
    app = _create_app("Floor App")
    _configure_cashback(app["id"], "Floor App", 0, 15)
    customer_id = _seed_customer(app["id"])

    result = _execute(_AWARD, {"customerId": customer_id, "paymentAmount": 100_001})
    assert result.errors is None
    assert result.data["awardCrmCashback"]["amount"] == 15_000


def test_award_rejects_below_threshold(award_workspace_id: int):
    app = _create_app("Threshold App")
    _configure_cashback(app["id"], "Threshold App", 100_000, 10)
    customer_id = _seed_customer(app["id"])

    result = _execute(_AWARD, {"customerId": customer_id, "paymentAmount": 99_999})
    assert result.errors is not None
    assert "below the cashback threshold" in str(result.errors[0])


def test_award_rejects_zero_credit(award_workspace_id: int):
    app = _create_app("Zero Percent")
    _configure_cashback(app["id"], "Zero Percent", 0, 0)
    customer_id = _seed_customer(app["id"])

    result = _execute(_AWARD, {"customerId": customer_id, "paymentAmount": 50_000})
    assert result.errors is not None
    assert "computed cashback credit must be positive" in str(result.errors[0])


def test_redeem_happy_path(award_workspace_id: int):
    app = _create_app("Redeem App")
    _configure_cashback(app["id"], "Redeem App", 0, 10)
    customer_id = _seed_customer(app["id"])

    awarded = _execute(_AWARD, {"customerId": customer_id, "paymentAmount": 100_000})
    assert awarded.errors is None

    result = _execute(
        _AWARD,
        {"customerId": customer_id, "redeemAmount": 4_000, "label": "Redeemed at till"},
    )
    assert result.errors is None
    entry = result.data["awardCrmCashback"]
    assert entry["amount"] == -4_000
    assert entry["paymentAmount"] is None
    assert entry["cashbackPercent"] is None
    assert entry["label"] == "Redeemed at till"


def test_redeem_rejects_insufficient_balance(award_workspace_id: int):
    app = _create_app("Broke App")
    customer_id = _seed_customer(app["id"])

    result = _execute(_AWARD, {"customerId": customer_id, "redeemAmount": 1_000})
    assert result.errors is not None
    assert "insufficient cashback balance" in str(result.errors[0])


def test_award_requires_exactly_one_mode(award_workspace_id: int):
    app = _create_app()
    customer_id = _seed_customer(app["id"])

    neither = _execute(_AWARD, {"customerId": customer_id})
    assert neither.errors is not None
    assert "exactly one of paymentAmount or redeemAmount" in str(neither.errors[0])

    both = _execute(
        _AWARD,
        {"customerId": customer_id, "paymentAmount": 1000, "redeemAmount": 500},
    )
    assert both.errors is not None
    assert "exactly one of paymentAmount or redeemAmount" in str(both.errors[0])


def test_award_rejects_non_positive_payment(award_workspace_id: int):
    app = _create_app()
    customer_id = _seed_customer(app["id"])

    zero = _execute(_AWARD, {"customerId": customer_id, "paymentAmount": 0})
    assert zero.errors is not None
    assert "paymentAmount must be a positive integer" in str(zero.errors[0])


def test_award_rejects_unknown_customer(award_workspace_id: int):
    result = _execute(_AWARD, {"customerId": str(uuid4()), "paymentAmount": 1000})
    assert result.errors is not None
    assert "CRM customer not found" in str(result.errors[0])


def test_award_denied_for_non_member(award_workspace_id: int):
    app = _create_app()
    _configure_cashback(app["id"], "Award App", 0, 10)
    customer_id = _seed_customer(app["id"])

    denied = _execute(
        _AWARD,
        {"customerId": customer_id, "paymentAmount": 1000},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert denied.errors is not None
    assert "Not allowed" in str(denied.errors[0])
