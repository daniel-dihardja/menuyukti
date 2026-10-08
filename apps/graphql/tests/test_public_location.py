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
from graphql.data_sources.models.menu import Menu
from graphql.data_sources.models.prediction import Prediction, PredictionOutcome
from graphql.schema import schema
from graphql.services.service_subscriptions import (
    SERVICE_KEY_DIGITAL_MENU,
    SERVICE_KEY_PREDICTION,
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
  }
}
"""

PREDS = """
query Preds($slug: String!) {
  publicLocationPredictions(slug: $slug) {
    id
    question
    status
    outcomes { id label }
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
    assert by_key["prediction"]["available"] is False
    assert by_key["digital_menu"]["hrefSegment"] == "menu"
    assert by_key["prediction"]["hrefSegment"] == "prediction"


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
                service_key=SERVICE_KEY_PREDICTION,
                status=SERVICE_STATUS_ACTIVE,
            )
        )
        session.add(Menu(location_id=lid, title="", public_enabled=True))
        session.commit()
    finally:
        session.close()

    result = asyncio.run(schema.execute(HUB, variable_values={"slug": hub_venue["slug"]}))
    assert result.errors is None, result.errors
    by_key = {s["key"]: s for s in result.data["publicLocation"]["services"]}
    assert by_key["digital_menu"]["available"] is True
    assert by_key["prediction"]["available"] is True


def test_public_location_predictions(hub_venue):
    lid = hub_venue["location_id"]
    wid = hub_venue["workspace_id"]
    session = SessionLocal()
    try:
        session.add(
            ServiceSubscription(
                workspace_id=wid,
                location_id=lid,
                service_key=SERVICE_KEY_PREDICTION,
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
