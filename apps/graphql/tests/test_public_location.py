"""Tests for publicLocation hub, publicLocationPredictions, updateLocationPublicSlug."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

import pytest
from graphql.data_sources import (
    Location,
    ServiceSubscription,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.menu import Menu, MenuCategory, MenuItem
from graphql.data_sources.models.prediction import Prediction, PredictionOutcome
from graphql.schema import schema
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_KEY_PICK_AND_WIN,
    SERVICE_STATUS_ACTIVE,
)
from graphql.services.workspace_plan import WORKSPACE_PLAN_PRO
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

HUB = """
query Hub($slug: String!) {
  publicLocation(slug: $slug) {
    id
    name
    publicSlug
    services { key hrefSegment available }
    headerImageFilename
    workspaceId
    mediaOwnerClerkUserId
    menuDishCount
    predictionTeaser { question openCount }
    votingTeaser { question openCount }
  }
}
"""

PREDS = """
query Preds($slug: String!) {
  publicLocationPredictions(slug: $slug) {
    id
    question
    status
    winningOutcomeId
    resolvedAt
    voteCount
    outcomes { id label }
  }
}
"""

CLOSE = """
mutation Close($predictionId: Int!) {
  closePrediction(predictionId: $predictionId) {
    id
    status
  }
}
"""

RESOLVE = """
mutation Resolve($predictionId: Int!, $winningOutcomeId: Int!) {
  resolvePrediction(predictionId: $predictionId, winningOutcomeId: $winningOutcomeId) {
    id
    status
    winningOutcomeId
  }
}
"""

SET_SLUG = """
mutation SetSlug($locationId: Int!, $publicSlug: String) {
  updateLocationPublicSlug(locationId: $locationId, publicSlug: $publicSlug) {
    locationId
    publicSlug
  }
}
"""


def _clear(session) -> None:
    session.query(Prediction).update(
        {Prediction.winning_outcome_id: None},
        synchronize_session=False,
    )
    session.query(PredictionOutcome).delete(synchronize_session=False)
    session.query(Prediction).delete(synchronize_session=False)
    session.query(Menu).filter(
        Menu.location_id.in_(
            session.query(Location.id).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID)
        )
    ).delete(synchronize_session=False)
    session.query(ServiceSubscription).filter(
        ServiceSubscription.location_id.in_(
            session.query(Location.id).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID)
        )
    ).delete(synchronize_session=False)
    session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
    session.query(WorkspaceMembership).filter(
        WorkspaceMembership.clerk_user_id == GRAPHQL_TEST_USER_ID
    ).delete()
    session.query(Workspace).filter(Workspace.owner_clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
    session.commit()


@pytest.fixture
def hub_venue():
    session = SessionLocal()
    try:
        _clear(session)
        ws = Workspace(
            name="Hub WS",
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
            name="Hub Cafe",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            workspace_id=ws.id,
            currency="EUR",
            public_slug="hub-cafe",
        )
        session.add(loc)
        session.commit()
        session.refresh(loc)
        lid = loc.id
        wid = ws.id
    finally:
        session.close()

    yield {"location_id": lid, "workspace_id": wid, "slug": "hub-cafe"}

    session = SessionLocal()
    try:
        _clear(session)
    finally:
        session.close()


def test_public_location_unknown_slug():
    result = asyncio.run(schema.execute(HUB, variable_values={"slug": "does-not-exist-xyz"}))
    assert result.errors is None, result.errors
    assert result.data["publicLocation"] is None


def test_public_location_greeting_only_no_services(hub_venue):
    result = asyncio.run(schema.execute(HUB, variable_values={"slug": hub_venue["slug"]}))
    assert result.errors is None, result.errors
    hub = result.data["publicLocation"]
    assert hub["name"] == "Hub Cafe"
    assert hub["publicSlug"] == "hub-cafe"
    by_key = {s["key"]: s for s in hub["services"]}
    assert by_key["digital_menu"]["available"] is False
    assert by_key["pick_and_win"]["available"] is False
    assert by_key["voting"]["available"] is False
    assert by_key["digital_menu"]["hrefSegment"] == "menu"
    assert by_key["pick_and_win"]["hrefSegment"] == "pick-and-win"
    assert by_key["voting"]["hrefSegment"] == "voting"
    assert hub["headerImageFilename"] is None
    assert hub["workspaceId"] is None
    assert hub["mediaOwnerClerkUserId"] is None
    assert hub["menuDishCount"] is None
    assert hub["predictionTeaser"] is None
    assert hub["votingTeaser"] is None


def test_public_location_menu_and_prediction_flags(hub_venue):
    lid = hub_venue["location_id"]
    wid = hub_venue["workspace_id"]
    session = SessionLocal()
    try:
        session.add(
            ServiceSubscription(
                workspace_id=wid,
                location_id=lid,
                service_key=SERVICE_KEY_DIGITAL_MENU,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        session.add(
            ServiceSubscription(
                workspace_id=wid,
                location_id=lid,
                service_key=SERVICE_KEY_PICK_AND_WIN,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        session.add(Menu(location_id=lid, title="", public_enabled=True))
        session.commit()
    finally:
        session.close()

    result = asyncio.run(schema.execute(HUB, variable_values={"slug": hub_venue["slug"]}))
    assert result.errors is None, result.errors
    hub = result.data["publicLocation"]
    by_key = {s["key"]: s for s in hub["services"]}
    assert by_key["digital_menu"]["available"] is True
    assert by_key["pick_and_win"]["available"] is True
    assert hub["menuDishCount"] == 0
    assert hub["workspaceId"] == str(wid)
    assert hub["mediaOwnerClerkUserId"] == GRAPHQL_TEST_USER_ID
    assert hub["headerImageFilename"] is None
    assert hub["predictionTeaser"] is None


def test_public_location_hub_presentation_fields(hub_venue):
    lid = hub_venue["location_id"]
    wid = hub_venue["workspace_id"]
    session = SessionLocal()
    try:
        session.add(
            ServiceSubscription(
                workspace_id=wid,
                location_id=lid,
                service_key=SERVICE_KEY_DIGITAL_MENU,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        session.add(
            ServiceSubscription(
                workspace_id=wid,
                location_id=lid,
                service_key=SERVICE_KEY_PICK_AND_WIN,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        menu = Menu(
            location_id=lid,
            title="",
            public_enabled=True,
            header_image_filename="hero.webp",
        )
        session.add(menu)
        session.flush()
        cat = MenuCategory(menu_id=menu.id, name="Mains", sort_order=0)
        session.add(cat)
        session.flush()
        session.add_all(
            [
                MenuItem(
                    menu_id=menu.id,
                    category_id=cat.id,
                    name="Burger",
                    description="",
                    price=12.0,
                    sort_order=0,
                    is_available=True,
                ),
                MenuItem(
                    menu_id=menu.id,
                    category_id=cat.id,
                    name="Hidden",
                    description="",
                    price=9.0,
                    sort_order=1,
                    is_available=False,
                ),
            ]
        )
        pred_early = Prediction(
            location_id=lid,
            question="First open?",
            status="open",
            closes_at=datetime.now(UTC) + timedelta(hours=2),
            reward_mode="social",
        )
        pred_later = Prediction(
            location_id=lid,
            question="Second open?",
            status="open",
            closes_at=datetime.now(UTC) + timedelta(hours=8),
            reward_mode="social",
        )
        session.add_all([pred_early, pred_later])
        session.flush()
        for pred in (pred_early, pred_later):
            session.add(PredictionOutcome(prediction_id=pred.id, label="A", sort_order=0))
            session.add(PredictionOutcome(prediction_id=pred.id, label="B", sort_order=1))
        session.commit()
    finally:
        session.close()

    result = asyncio.run(schema.execute(HUB, variable_values={"slug": hub_venue["slug"]}))
    assert result.errors is None, result.errors
    hub = result.data["publicLocation"]
    assert hub["headerImageFilename"] == "hero.webp"
    assert hub["menuDishCount"] == 1
    assert hub["workspaceId"] == str(wid)
    assert hub["mediaOwnerClerkUserId"] == GRAPHQL_TEST_USER_ID
    assert hub["predictionTeaser"] == {"question": "First open?", "openCount": 2}


def test_public_location_predictions(hub_venue):
    lid = hub_venue["location_id"]
    wid = hub_venue["workspace_id"]
    session = SessionLocal()
    try:
        session.add(
            ServiceSubscription(
                workspace_id=wid,
                location_id=lid,
                service_key=SERVICE_KEY_PICK_AND_WIN,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        pred = Prediction(
            location_id=lid,
            question="Who wins?",
            status="open",
            closes_at=datetime.now(UTC) + timedelta(hours=6),
            reward_mode="social",
        )
        session.add(pred)
        session.flush()
        session.add(PredictionOutcome(prediction_id=pred.id, label="A", sort_order=0))
        session.add(PredictionOutcome(prediction_id=pred.id, label="B", sort_order=1))
        session.commit()
    finally:
        session.close()

    empty = asyncio.run(schema.execute(PREDS, variable_values={"slug": "nope"}))
    assert empty.data["publicLocationPredictions"] == []

    listed = asyncio.run(schema.execute(PREDS, variable_values={"slug": hub_venue["slug"]}))
    assert listed.errors is None, listed.errors
    assert len(listed.data["publicLocationPredictions"]) == 1
    assert listed.data["publicLocationPredictions"][0]["question"] == "Who wins?"


def test_public_predictions_include_closed_and_recent_resolved(hub_venue):
    lid = hub_venue["location_id"]
    wid = hub_venue["workspace_id"]
    slug = hub_venue["slug"]
    session = SessionLocal()
    try:
        session.add(
            ServiceSubscription(
                workspace_id=wid,
                location_id=lid,
                service_key=SERVICE_KEY_PICK_AND_WIN,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        pred = Prediction(
            location_id=lid,
            question="Public result?",
            status="open",
            closes_at=datetime.now(UTC) + timedelta(hours=6),
            reward_mode="social",
        )
        session.add(pred)
        session.flush()
        outcome_a = PredictionOutcome(prediction_id=pred.id, label="A", sort_order=0)
        outcome_b = PredictionOutcome(prediction_id=pred.id, label="B", sort_order=1)
        session.add(outcome_a)
        session.add(outcome_b)
        session.commit()
        pred_id = int(pred.id)
        winning_id = int(outcome_a.id)
    finally:
        session.close()

    closed = asyncio.run(
        schema.execute(
            CLOSE,
            variable_values={"predictionId": pred_id},
            context_value=graphql_auth_context(),
        )
    )
    assert closed.errors is None, closed.errors

    listed_closed = asyncio.run(schema.execute(PREDS, variable_values={"slug": slug}))
    assert listed_closed.errors is None, listed_closed.errors
    assert len(listed_closed.data["publicLocationPredictions"]) == 1
    assert listed_closed.data["publicLocationPredictions"][0]["status"] == "closed"

    resolved = asyncio.run(
        schema.execute(
            RESOLVE,
            variable_values={"predictionId": pred_id, "winningOutcomeId": winning_id},
            context_value=graphql_auth_context(),
        )
    )
    assert resolved.errors is None, resolved.errors

    listed_resolved = asyncio.run(schema.execute(PREDS, variable_values={"slug": slug}))
    assert listed_resolved.errors is None, listed_resolved.errors
    card = listed_resolved.data["publicLocationPredictions"][0]
    assert card["status"] == "resolved"
    assert card["winningOutcomeId"] == winning_id

    from graphql.services.predictions import GUEST_RESOLVED_RETENTION_DAYS

    session = SessionLocal()
    try:
        row = session.get(Prediction, pred_id)
        assert row is not None
        row.resolved_at = datetime.now(UTC) - timedelta(days=GUEST_RESOLVED_RETENTION_DAYS + 1)
        session.commit()
    finally:
        session.close()

    listed_old = asyncio.run(schema.execute(PREDS, variable_values={"slug": slug}))
    assert listed_old.errors is None, listed_old.errors
    assert listed_old.data["publicLocationPredictions"] == []


def test_update_public_slug_without_digital_menu(hub_venue):
    lid = hub_venue["location_id"]
    result = asyncio.run(
        schema.execute(
            SET_SLUG,
            variable_values={"locationId": lid, "publicSlug": "new-hub-slug"},
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None, result.errors
    assert result.data["updateLocationPublicSlug"]["publicSlug"] == "new-hub-slug"

    hub = asyncio.run(schema.execute(HUB, variable_values={"slug": "new-hub-slug"}))
    assert hub.data["publicLocation"]["id"] == lid


def test_reserved_slug_rejected(hub_venue):
    result = asyncio.run(
        schema.execute(
            SET_SLUG,
            variable_values={
                "locationId": hub_venue["location_id"],
                "publicSlug": "home",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is not None
    assert "reserved" in str(result.errors[0]).lower()


UPDATE_LOC = """
mutation UpdateLoc($id: ID!, $publicSlug: String) {
  updateLocation(id: $id, publicSlug: $publicSlug) {
    id
    publicSlug
  }
}
"""

CREATE_LOC = """
mutation CreateLoc($workspaceId: ID!, $name: String!, $publicSlug: String) {
  createLocation(workspaceId: $workspaceId, name: $name, publicSlug: $publicSlug) {
    id
    name
    publicSlug
  }
}
"""


def test_update_location_sets_and_clears_public_slug(hub_venue):
    lid = str(hub_venue["location_id"])
    set_result = asyncio.run(
        schema.execute(
            UPDATE_LOC,
            variable_values={"id": lid, "publicSlug": "basics-slug"},
            context_value=graphql_auth_context(),
        )
    )
    assert set_result.errors is None, set_result.errors
    assert set_result.data["updateLocation"]["publicSlug"] == "basics-slug"

    clear_result = asyncio.run(
        schema.execute(
            UPDATE_LOC,
            variable_values={"id": lid, "publicSlug": None},
            context_value=graphql_auth_context(),
        )
    )
    assert clear_result.errors is None, clear_result.errors
    assert clear_result.data["updateLocation"]["publicSlug"] is None


def test_update_location_reserved_and_duplicate_slug(hub_venue):
    lid = str(hub_venue["location_id"])
    reserved = asyncio.run(
        schema.execute(
            UPDATE_LOC,
            variable_values={"id": lid, "publicSlug": "services"},
            context_value=graphql_auth_context(),
        )
    )
    assert reserved.errors is not None
    assert "reserved" in str(reserved.errors[0]).lower()

    asyncio.run(
        schema.execute(
            UPDATE_LOC,
            variable_values={"id": lid, "publicSlug": "taken-slug"},
            context_value=graphql_auth_context(),
        )
    )
    other = asyncio.run(
        schema.execute(
            CREATE_LOC,
            variable_values={
                "workspaceId": str(hub_venue["workspace_id"]),
                "name": "Other Cafe",
                "publicSlug": "taken-slug",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert other.errors is not None
    assert "already in use" in str(other.errors[0]).lower()


def test_create_location_with_public_slug(hub_venue):
    result = asyncio.run(
        schema.execute(
            CREATE_LOC,
            variable_values={
                "workspaceId": str(hub_venue["workspace_id"]),
                "name": "Slug Cafe",
                "publicSlug": "slug-cafe",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None, result.errors
    assert result.data["createLocation"]["publicSlug"] == "slug-cafe"
