"""Tests for locationManualBriefInput query and updateLocationManualBriefInput mutation."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import Location, LocationManualBriefInput, SessionLocal
from graphql.schema import schema
from graphql.services.manual_quick_profile import (
    is_quick_profile_empty,
    validate_and_normalize_quick_profile,
)
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_QUERY = """
query ManualBrief($locationId: Int!) {
  locationManualBriefInput(locationId: $locationId) {
    locationId
    quickProfile
  }
}
"""

_MUTATION = """
mutation UpdateManualBrief($locationId: Int!, $quickProfile: JSON!) {
  updateLocationManualBriefInput(locationId: $locationId, quickProfile: $quickProfile) {
    locationId
    quickProfile
  }
}
"""


@pytest.fixture
def manual_brief_location_id():
    session = SessionLocal()
    try:
        loc = Location(name="Manual Brief Test Loc", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(loc)
        session.commit()
        session.refresh(loc)
        lid = loc.id
    finally:
        session.close()
    yield lid
    session = SessionLocal()
    try:
        session.query(LocationManualBriefInput).filter(
            LocationManualBriefInput.location_id == lid
        ).delete()
        session.query(Location).filter(Location.id == lid).delete()
        session.commit()
    finally:
        session.close()


def test_is_quick_profile_empty_treats_video_false_only_as_empty():
    assert is_quick_profile_empty({}) is True
    assert is_quick_profile_empty({"videoComfort": False}) is True
    assert is_quick_profile_empty({"videoComfort": True}) is False
    assert is_quick_profile_empty({"venueConcepts": ["cafe"]}) is False


def test_manual_quick_profile_validation():
    assert validate_and_normalize_quick_profile({}) == {}
    assert validate_and_normalize_quick_profile(
        {
            "venueConcepts": ["Bistro", "cafe"],
            "socialGoals": ["walk_ins", "awareness"],
            "guestTags": ["families", "date_night", "tourists"],
            "locationFocus": ["brunch", "lunch"],
            "tonePresets": ["warm", "minimal"],
            "videoComfort": True,
        }
    ) == {
        "venueConcepts": ["bistro", "cafe"],
        "socialGoals": ["walk_ins", "awareness"],
        "guestTags": ["families", "date_night", "tourists"],
        "locationFocus": ["brunch", "lunch"],
        "tonePresets": ["warm", "minimal"],
        "videoComfort": True,
    }
    assert validate_and_normalize_quick_profile(
        {"venueConcept": "Cafe", "tonePreset": "Bold"}
    ) == {"venueConcepts": ["cafe"], "tonePresets": ["bold"]}
    with pytest.raises(ValueError, match="Invalid locationFocus"):
        validate_and_normalize_quick_profile({"locationFocus": ["supper"]})
    with pytest.raises(ValueError, match="Unknown"):
        validate_and_normalize_quick_profile({"foo": 1})


def test_query_returns_empty_when_no_row(manual_brief_location_id):
    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={"locationId": manual_brief_location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    data = result.data["locationManualBriefInput"]
    assert data["locationId"] == manual_brief_location_id
    assert data["quickProfile"] == {}


def test_upsert_and_clear(manual_brief_location_id):
    profile = {
        "venueConcepts": ["cafe"],
        "socialGoals": ["awareness", "walk_ins"],
        "guestTags": ["office_lunch"],
        "locationFocus": ["dinner"],
        "tonePresets": ["professional"],
        "videoComfort": False,
    }
    r1 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={"locationId": manual_brief_location_id, "quickProfile": profile},
            context_value=graphql_auth_context(),
        )
    )
    assert not r1.errors
    qp = r1.data["updateLocationManualBriefInput"]["quickProfile"]
    assert qp["venueConcepts"] == ["cafe"]
    assert qp["socialGoals"] == ["awareness", "walk_ins"]
    assert qp["locationFocus"] == ["dinner"]

    r2 = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={"locationId": manual_brief_location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not r2.errors
    assert r2.data["locationManualBriefInput"]["quickProfile"]["socialGoals"] == [
        "awareness",
        "walk_ins",
    ]

    r3 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={"locationId": manual_brief_location_id, "quickProfile": {}},
            context_value=graphql_auth_context(),
        )
    )
    assert not r3.errors
    assert r3.data["updateLocationManualBriefInput"]["quickProfile"] == {}

    session = SessionLocal()
    try:
        row = (
            session.query(LocationManualBriefInput)
            .filter(LocationManualBriefInput.location_id == manual_brief_location_id)
            .first()
        )
        assert row is None
    finally:
        session.close()


def test_mutation_rejects_invalid_enum(manual_brief_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": manual_brief_location_id,
                "quickProfile": {"venueConcepts": ["not_a_real_venue"]},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "Invalid venueConcepts entry" in result.errors[0].message
