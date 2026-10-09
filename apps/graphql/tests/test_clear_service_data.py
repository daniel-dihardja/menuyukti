"""Tests for clearWorkspaceServiceData staff mutation."""

from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from graphql.data_sources import (
    Location,
    PointEarnRule,
    PointLedgerEntry,
    PosOrder,
    Prediction,
    PredictionOutcome,
    PredictionVote,
    ServiceSubscription,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.menu import Menu, MenuCategory, MenuItem
from graphql.data_sources.models.voting import Voting, VotingOption, VotingVote
from graphql.schema import schema
from graphql.services.menu import (
    MenuCategoryReplaceInput,
    MenuItemReplaceInput,
    get_or_create_menu,
    replace_menu_categories,
)
from graphql.services.predictions import (
    ACTION_KEY_PREDICTION_CORRECT,
    ACTION_KEY_PREDICTION_VOTE,
)
from graphql.services.service_subscriptions import (
    SERVICE_KEY_CASHBACK,
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_KEY_PICK_AND_WIN,
    SERVICE_KEY_POINT_SYSTEM,
    SERVICE_KEY_STAMP_CARD,
    SERVICE_KEY_VOTING,
    SERVICE_STATUS_ACTIVE,
    SERVICE_STATUS_CANCELED,
)
from graphql.services.votings import ACTION_KEY_VOTING_VOTE
from graphql.tests.auth_context import graphql_auth_context

CLEAR = """
mutation ClearWorkspaceServiceData($targetClerkUserId: String!, $serviceKey: String!) {
  clearWorkspaceServiceData(targetClerkUserId: $targetClerkUserId, serviceKey: $serviceKey) {
    serviceKey
    clerkUserId
    workspaceId
    locationIds
    predictionsDeleted
    votingsDeleted
    ledgerEntriesDeleted
    earnRulesDeleted
    posOrdersDeleted
    menuCategoriesCleared
    subscriptionsCanceled
    notes
  }
}
"""


def _uid(prefix: str = "clear_svc") -> str:
    return f"clerk_{prefix}_{uuid.uuid4().hex[:12]}"


@pytest.fixture
def clear_workspace():
    seed_user = _uid()
    session = SessionLocal()
    try:
        now = datetime.now(tz=UTC)
        ws = Workspace(name="Clear Service Data WS", owner_clerk_user_id=seed_user, plan="pro")
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=seed_user,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        loc = Location(
            name="Clear Cafe",
            city="Berlin",
            country="Germany",
            currency="EUR",
            workspace_id=ws.id,
            clerk_user_id=seed_user,
        )
        session.add(loc)
        session.commit()
        yield {
            "workspace_id": ws.id,
            "location_id": loc.id,
            "clerk_user_id": seed_user,
        }
    finally:
        session.close()

    session = SessionLocal()
    try:
        lid = None
        ws_id = None
        row = session.query(Location).filter(Location.clerk_user_id == seed_user).first()
        if row is not None:
            lid = row.id
            ws_id = row.workspace_id
        if lid is not None:
            session.query(PointLedgerEntry).filter(PointLedgerEntry.location_id == lid).delete(
                synchronize_session=False
            )
            session.query(PointEarnRule).filter(PointEarnRule.location_id == lid).delete(
                synchronize_session=False
            )
            pred_ids = [
                int(r[0])
                for r in session.query(Prediction.id).filter(Prediction.location_id == lid).all()
            ]
            if pred_ids:
                session.query(PredictionVote).filter(
                    PredictionVote.prediction_id.in_(pred_ids)
                ).delete(synchronize_session=False)
                session.query(Prediction).filter(Prediction.id.in_(pred_ids)).update(
                    {Prediction.winning_outcome_id: None},
                    synchronize_session=False,
                )
                session.flush()
                session.query(PredictionOutcome).filter(
                    PredictionOutcome.prediction_id.in_(pred_ids)
                ).delete(synchronize_session=False)
                session.query(Prediction).filter(Prediction.id.in_(pred_ids)).delete(
                    synchronize_session=False
                )
            voting_ids = [
                int(r[0]) for r in session.query(Voting.id).filter(Voting.location_id == lid).all()
            ]
            if voting_ids:
                session.query(VotingVote).filter(VotingVote.voting_id.in_(voting_ids)).delete(
                    synchronize_session=False
                )
                session.query(Voting).filter(Voting.id.in_(voting_ids)).update(
                    {Voting.winning_option_id: None},
                    synchronize_session=False,
                )
                session.flush()
                session.query(VotingOption).filter(VotingOption.voting_id.in_(voting_ids)).delete(
                    synchronize_session=False
                )
                session.query(Voting).filter(Voting.id.in_(voting_ids)).delete(
                    synchronize_session=False
                )
            session.query(ServiceSubscription).filter(
                ServiceSubscription.location_id == lid
            ).delete(synchronize_session=False)
            session.query(PosOrder).filter(PosOrder.location_id == lid).delete(
                synchronize_session=False
            )
            menu = session.query(Menu).filter(Menu.location_id == lid).first()
            if menu is not None:
                session.query(MenuItem).filter(MenuItem.menu_id == menu.id).delete(
                    synchronize_session=False
                )
                session.query(MenuCategory).filter(MenuCategory.menu_id == menu.id).delete(
                    synchronize_session=False
                )
                session.delete(menu)
            session.query(Location).filter(Location.id == lid).delete(synchronize_session=False)
        if ws_id is not None:
            session.query(WorkspaceMembership).filter(
                WorkspaceMembership.workspace_id == ws_id
            ).delete(synchronize_session=False)
            session.query(Workspace).filter(Workspace.id == ws_id).delete(synchronize_session=False)
        session.commit()
    finally:
        session.close()


def _run_clear(clerk_user_id: str, service_key: str, *, context=None):
    return asyncio.run(
        schema.execute(
            CLEAR,
            variable_values={
                "targetClerkUserId": clerk_user_id,
                "serviceKey": service_key,
            },
            context_value=context if context is not None else graphql_auth_context(),
        )
    )


def test_clear_requires_auth(clear_workspace):
    result = _run_clear(
        clear_workspace["clerk_user_id"],
        SERVICE_KEY_POINT_SYSTEM,
        context={},
    )
    assert result.errors
    assert "authenticated" in str(result.errors[0]).lower()


def test_clear_blocked_in_production(monkeypatch, clear_workspace):
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.delenv("ALLOW_DEV_DATA_INGEST", raising=False)

    result = _run_clear(clear_workspace["clerk_user_id"], SERVICE_KEY_POINT_SYSTEM)
    assert result.errors
    assert "ALLOW_DEV_DATA_INGEST" in str(result.errors[0])


def test_clear_allowed_in_production_with_flag(monkeypatch, clear_workspace):
    monkeypatch.setenv("GRAPHQL_ENV", "production")
    monkeypatch.setenv("ALLOW_DEV_DATA_INGEST", "1")

    result = _run_clear(clear_workspace["clerk_user_id"], SERVICE_KEY_STAMP_CARD)
    assert not result.errors, result.errors
    assert result.data["clearWorkspaceServiceData"]["serviceKey"] == SERVICE_KEY_STAMP_CARD


def test_clear_rejects_unknown_service_key(clear_workspace):
    result = _run_clear(clear_workspace["clerk_user_id"], "not_a_service")
    assert result.errors
    assert "serviceKey" in str(result.errors[0]) or "service key" in str(result.errors[0]).lower()


def test_clear_missing_workspace():
    result = _run_clear(_uid("missing_ws"), SERVICE_KEY_POINT_SYSTEM)
    assert result.errors
    assert "No workspace found" in str(result.errors[0])


def test_clear_cashback_rejected(clear_workspace):
    result = _run_clear(clear_workspace["clerk_user_id"], SERVICE_KEY_CASHBACK)
    assert result.errors
    assert "CRM" in str(result.errors[0])


def test_clear_stamp_card_noop(clear_workspace):
    result = _run_clear(clear_workspace["clerk_user_id"], SERVICE_KEY_STAMP_CARD)
    assert not result.errors, result.errors
    payload = result.data["clearWorkspaceServiceData"]
    assert payload["workspaceId"] == str(clear_workspace["workspace_id"])
    assert payload["locationIds"] == [str(clear_workspace["location_id"])]
    assert payload["predictionsDeleted"] == 0
    assert any("no domain data" in n for n in payload["notes"])


def test_clear_pick_and_win(clear_workspace):
    lid = clear_workspace["location_id"]
    ws_id = clear_workspace["workspace_id"]
    session = SessionLocal()
    try:
        pred = Prediction(
            location_id=lid,
            question="Who wins?",
            status="open",
            closes_at=datetime.now(tz=UTC) + timedelta(hours=24),
            reward_mode="points",
            points_for_vote=1,
            points_for_correct=5,
        )
        session.add(pred)
        session.flush()
        o1 = PredictionOutcome(prediction_id=pred.id, label="A", sort_order=0)
        o2 = PredictionOutcome(prediction_id=pred.id, label="B", sort_order=1)
        session.add_all([o1, o2])
        session.flush()
        session.add(
            PredictionVote(
                prediction_id=pred.id,
                outcome_id=o1.id,
                clerk_user_id="guest_clear_a",
            )
        )
        session.add(
            PointLedgerEntry(
                clerk_user_id="guest_clear_a",
                location_id=lid,
                amount=1,
                action_key=ACTION_KEY_PREDICTION_VOTE,
                source_ref=f"prediction:{pred.id}",
            )
        )
        session.add(
            PointLedgerEntry(
                clerk_user_id="guest_clear_a",
                location_id=lid,
                amount=10,
                action_key="complete_order",
                source_ref="pos_order:1",
            )
        )
        session.add(
            ServiceSubscription(
                workspace_id=ws_id,
                location_id=lid,
                service_key=SERVICE_KEY_PICK_AND_WIN,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        session.commit()
        pred_id = pred.id
    finally:
        session.close()

    result = _run_clear(clear_workspace["clerk_user_id"], SERVICE_KEY_PICK_AND_WIN)
    assert not result.errors, result.errors
    payload = result.data["clearWorkspaceServiceData"]
    assert payload["predictionsDeleted"] == 1
    assert payload["ledgerEntriesDeleted"] == 1
    assert payload["subscriptionsCanceled"] == 1

    session = SessionLocal()
    try:
        assert session.get(Prediction, pred_id) is None
        assert (
            session.query(PointLedgerEntry)
            .filter(
                PointLedgerEntry.location_id == lid,
                PointLedgerEntry.action_key == ACTION_KEY_PREDICTION_VOTE,
            )
            .count()
            == 0
        )
        assert (
            session.query(PointLedgerEntry)
            .filter(
                PointLedgerEntry.location_id == lid,
                PointLedgerEntry.action_key == "complete_order",
            )
            .count()
            == 1
        )
        assert (
            session.query(PointLedgerEntry)
            .filter(
                PointLedgerEntry.location_id == lid,
                PointLedgerEntry.action_key == ACTION_KEY_PREDICTION_CORRECT,
            )
            .count()
            == 0
        )
        sub = (
            session.query(ServiceSubscription)
            .filter(
                ServiceSubscription.location_id == lid,
                ServiceSubscription.service_key == SERVICE_KEY_PICK_AND_WIN,
            )
            .one()
        )
        assert sub.status == SERVICE_STATUS_CANCELED
    finally:
        session.close()


def test_clear_voting(clear_workspace):
    lid = clear_workspace["location_id"]
    ws_id = clear_workspace["workspace_id"]
    session = SessionLocal()
    try:
        voting = Voting(
            location_id=lid,
            question="Which dish?",
            status="open",
            reward_mode="points",
            points_for_vote=5,
            points_for_correct=0,
        )
        session.add(voting)
        session.flush()
        o1 = VotingOption(voting_id=voting.id, label="A", sort_order=0)
        o2 = VotingOption(voting_id=voting.id, label="B", sort_order=1)
        session.add_all([o1, o2])
        session.flush()
        session.add(
            VotingVote(
                voting_id=voting.id,
                option_id=o1.id,
                clerk_user_id="guest_clear_vote",
            )
        )
        session.add(
            PointLedgerEntry(
                clerk_user_id="guest_clear_vote",
                location_id=lid,
                amount=5,
                action_key=ACTION_KEY_VOTING_VOTE,
                source_ref=f"voting:{voting.id}:vote",
            )
        )
        session.add(
            PointLedgerEntry(
                clerk_user_id="guest_clear_vote",
                location_id=lid,
                amount=10,
                action_key="complete_order",
                source_ref="pos_order:9",
            )
        )
        session.add(
            ServiceSubscription(
                workspace_id=ws_id,
                location_id=lid,
                service_key=SERVICE_KEY_VOTING,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        session.commit()
        voting_id = voting.id
        option_ids = [o1.id, o2.id]
    finally:
        session.close()

    result = _run_clear(clear_workspace["clerk_user_id"], SERVICE_KEY_VOTING)
    assert not result.errors, result.errors
    payload = result.data["clearWorkspaceServiceData"]
    assert payload["votingsDeleted"] == 1
    assert payload["ledgerEntriesDeleted"] == 1
    assert payload["subscriptionsCanceled"] == 1

    session = SessionLocal()
    try:
        assert session.get(Voting, voting_id) is None
        assert session.query(VotingOption).filter(VotingOption.id.in_(option_ids)).count() == 0
        assert session.query(VotingVote).filter(VotingVote.voting_id == voting_id).count() == 0
        assert (
            session.query(PointLedgerEntry)
            .filter(
                PointLedgerEntry.location_id == lid,
                PointLedgerEntry.action_key == ACTION_KEY_VOTING_VOTE,
            )
            .count()
            == 0
        )
        assert (
            session.query(PointLedgerEntry)
            .filter(
                PointLedgerEntry.location_id == lid,
                PointLedgerEntry.action_key == "complete_order",
            )
            .count()
            == 1
        )
        sub = (
            session.query(ServiceSubscription)
            .filter(
                ServiceSubscription.location_id == lid,
                ServiceSubscription.service_key == SERVICE_KEY_VOTING,
            )
            .one()
        )
        assert sub.status == SERVICE_STATUS_CANCELED
    finally:
        session.close()


def test_clear_point_system(clear_workspace):
    lid = clear_workspace["location_id"]
    session = SessionLocal()
    try:
        session.add(
            PointEarnRule(location_id=lid, action_key="complete_order", points=5, enabled=True)
        )
        session.add(
            PointLedgerEntry(
                clerk_user_id="guest_pts",
                location_id=lid,
                amount=5,
                action_key="complete_order",
                source_ref="pos_order:99",
            )
        )
        session.add(
            PointLedgerEntry(
                clerk_user_id="guest_pts",
                location_id=lid,
                amount=1,
                action_key=ACTION_KEY_PREDICTION_VOTE,
                source_ref="prediction:99",
            )
        )
        session.commit()
    finally:
        session.close()

    result = _run_clear(clear_workspace["clerk_user_id"], SERVICE_KEY_POINT_SYSTEM)
    assert not result.errors, result.errors
    payload = result.data["clearWorkspaceServiceData"]
    assert payload["ledgerEntriesDeleted"] == 2
    assert payload["earnRulesDeleted"] == 1

    session = SessionLocal()
    try:
        assert (
            session.query(PointLedgerEntry).filter(PointLedgerEntry.location_id == lid).count() == 0
        )
        assert session.query(PointEarnRule).filter(PointEarnRule.location_id == lid).count() == 0
    finally:
        session.close()


def test_clear_digital_menu(clear_workspace):
    lid = clear_workspace["location_id"]
    session = SessionLocal()
    try:
        menu = get_or_create_menu(session, lid, title="Clear Menu")
        replace_menu_categories(
            session,
            menu,
            [
                MenuCategoryReplaceInput(
                    name="Mains",
                    items=[
                        MenuItemReplaceInput(name="Pasta", price=12.0),
                        MenuItemReplaceInput(name="Salad", price=8.0),
                    ],
                )
            ],
        )
        session.flush()
        item = session.query(MenuItem).filter(MenuItem.menu_id == menu.id).first()
        assert item is not None
        order = PosOrder(
            location_id=lid,
            bill_number="CLR-1",
            status="open",
            opened_by_clerk_user_id=clear_workspace["clerk_user_id"],
        )
        session.add(order)
        session.flush()
        from graphql.data_sources.models.pos_order import PosOrderLine

        session.add(
            PosOrderLine(
                pos_order_id=order.id,
                menu_item_id=item.id,
                name_snapshot=item.name,
                menu_category_snapshot="Mains",
                qty=1,
                unit_price=float(item.price),
                line_total=float(item.price),
                sort_order=0,
            )
        )
        session.commit()
        menu_id = menu.id
    finally:
        session.close()

    result = _run_clear(clear_workspace["clerk_user_id"], SERVICE_KEY_DIGITAL_MENU)
    assert not result.errors, result.errors
    payload = result.data["clearWorkspaceServiceData"]
    assert payload["posOrdersDeleted"] == 1
    assert payload["menuCategoriesCleared"] >= 1

    session = SessionLocal()
    try:
        assert session.query(PosOrder).filter(PosOrder.location_id == lid).count() == 0
        menu = session.get(Menu, menu_id)
        assert menu is not None
        assert session.query(MenuCategory).filter(MenuCategory.menu_id == menu_id).count() == 0
        assert session.query(MenuItem).filter(MenuItem.menu_id == menu_id).count() == 0
    finally:
        session.close()
