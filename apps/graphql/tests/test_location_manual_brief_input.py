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
    # New booleans participate in the same sentinel-only logic.
    assert is_quick_profile_empty({"servesAlcohol": False}) is True
    assert is_quick_profile_empty({"videoComfort": False, "servesAlcohol": False}) is True
    assert is_quick_profile_empty({"servesAlcohol": True}) is False
    assert is_quick_profile_empty({"instagramHandle": "menuyukti"}) is False


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
    assert validate_and_normalize_quick_profile({"venueConcept": "Cafe", "tonePreset": "Bold"}) == {
        "venueConcepts": ["cafe"],
        "tonePresets": ["bold"],
    }
    with pytest.raises(ValueError, match="Invalid locationFocus"):
        validate_and_normalize_quick_profile({"locationFocus": ["supper"]})
    with pytest.raises(ValueError, match="Unknown"):
        validate_and_normalize_quick_profile({"foo": 1})


def test_manual_quick_profile_accepts_extended_fields():
    """New Instagram-readiness fields validate, normalize, and round-trip."""
    profile = {
        "cuisineTypes": ["Italian", "indonesian", "italian"],
        "serviceModes": ["dine_in", "delivery"],
        "ambienceTags": ["cozy", "family_friendly"],
        "postLanguages": ["DE", "en"],
        "dietaryOptions": ["vegan", "halal"],
        "priceTier": "Mid",
        "servesAlcohol": True,
        "instagramHandle": "@MenuYukti",
        "websiteUrl": "https://menuyukti.example/",
        "reservationUrl": "https://book.example/menu",
        "onlineOrderUrl": "https://order.example/",
        "menuUrl": "https://menu.example/",
        "googleMapsUrl": "https://maps.google.com/?q=Menuyukti",
        "phone": "+49 30 1234 567",
        "contactEmail": "hello@menuyukti.example",
        "neighborhood": "Mitte",
        "valueProposition": "Friendly Indonesian bistro for office lunches.",
        "aboutStory": "Family-run since 2014, recipes from Java.",
        "topicsToAvoid": "No discount-led messaging on dinner posts.",
        "notes": "Great for group dinners and birthdays.",
    }
    result = validate_and_normalize_quick_profile(profile)
    assert result["cuisineTypes"] == ["italian", "indonesian"]
    assert result["serviceModes"] == ["dine_in", "delivery"]
    assert result["ambienceTags"] == ["cozy", "family_friendly"]
    assert result["postLanguages"] == ["de", "en"]
    assert result["dietaryOptions"] == ["vegan", "halal"]
    assert result["priceTier"] == "mid"
    assert result["servesAlcohol"] is True
    assert result["instagramHandle"] == "MenuYukti"
    assert result["websiteUrl"] == "https://menuyukti.example/"
    assert result["reservationUrl"] == "https://book.example/menu"
    assert result["phone"] == "+49 30 1234 567"
    assert result["contactEmail"] == "hello@menuyukti.example"
    assert result["neighborhood"] == "Mitte"
    assert result["valueProposition"] == ("Friendly Indonesian bistro for office lunches.")
    assert result["aboutStory"].startswith("Family-run since 2014")
    assert result["topicsToAvoid"].startswith("No discount-led")
    assert result["notes"] == "Great for group dinners and birthdays."


def test_manual_quick_profile_rejects_invalid_extended_fields():
    with pytest.raises(ValueError, match="Invalid cuisineTypes"):
        validate_and_normalize_quick_profile({"cuisineTypes": ["martian"]})
    with pytest.raises(ValueError, match="Invalid serviceModes"):
        validate_and_normalize_quick_profile({"serviceModes": ["fly_through"]})
    with pytest.raises(ValueError, match="Invalid postLanguages"):
        validate_and_normalize_quick_profile({"postLanguages": ["xx"]})
    with pytest.raises(ValueError, match="Invalid priceTier"):
        validate_and_normalize_quick_profile({"priceTier": "ultra"})
    with pytest.raises(ValueError, match="servesAlcohol must be a boolean"):
        validate_and_normalize_quick_profile({"servesAlcohol": "yes"})
    with pytest.raises(ValueError, match="instagramHandle"):
        validate_and_normalize_quick_profile({"instagramHandle": "bad handle!"})
    with pytest.raises(ValueError, match="contactEmail"):
        validate_and_normalize_quick_profile({"contactEmail": "not-an-email"})
    with pytest.raises(ValueError, match="websiteUrl must start with"):
        validate_and_normalize_quick_profile({"websiteUrl": "ftp://example.com"})
    with pytest.raises(ValueError, match="valueProposition must be at most"):
        validate_and_normalize_quick_profile({"valueProposition": "x" * 200})
    assert validate_and_normalize_quick_profile({"notes": "x" * 2001})["notes"] == ("x" * 2001)


def test_manual_quick_profile_accepts_long_notes():
    notes = "x" * 5000
    result = validate_and_normalize_quick_profile({"notes": notes})
    assert result["notes"] == notes


def test_manual_quick_profile_drops_blank_text_fields():
    """Empty / whitespace-only text inputs are dropped, not stored as ``""``."""
    result = validate_and_normalize_quick_profile(
        {
            "instagramHandle": "   ",
            "valueProposition": "",
            "aboutStory": "  \n\t  ",
            "neighborhood": "",
        }
    )
    assert result == {}


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
