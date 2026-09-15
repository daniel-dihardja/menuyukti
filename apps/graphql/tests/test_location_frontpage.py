"""Tests for nested location.frontpage and updateLocationFrontpage mutation."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import Location, LocationFrontpage, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_LOCATION_FRONTPAGE_QUERY = """
query LocationFrontpage($id: ID!) {
  location(id: $id) {
    id
    frontpage {
      locationId
      tagline
      showGuestFavorites
      showPopularCombos
      favoriteImages {
        menu
        imageFilename
        description
        published
      }
      comboImages {
        menuA
        menuB
        imageFilename
        description
        published
      }
    }
  }
}
"""

_MUTATION = """
mutation UpdateFrontpage(
  $locationId: Int!
  $tagline: String
  $showGuestFavorites: Boolean!
  $showPopularCombos: Boolean!
  $favoriteImages: [FrontpageFavoriteImageInput!]
  $comboImages: [FrontpageComboImageInput!]
) {
  updateLocationFrontpage(
    locationId: $locationId
    tagline: $tagline
    showGuestFavorites: $showGuestFavorites
    showPopularCombos: $showPopularCombos
    favoriteImages: $favoriteImages
    comboImages: $comboImages
  ) {
    locationId
    tagline
    showGuestFavorites
    showPopularCombos
    favoriteImages {
      menu
      imageFilename
      description
      published
    }
    comboImages {
      menuA
      menuB
      imageFilename
      description
      published
    }
  }
}
"""


@pytest.fixture
def frontpage_location_id():
    session = SessionLocal()
    try:
        loc = Location(name="Frontpage Test Loc", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(loc)
        session.commit()
        session.refresh(loc)
        lid = loc.id
    finally:
        session.close()
    yield lid
    session = SessionLocal()
    try:
        session.query(LocationFrontpage).filter(LocationFrontpage.location_id == lid).delete()
        session.query(Location).filter(Location.id == lid).delete()
        session.commit()
    finally:
        session.close()


def test_query_returns_defaults_when_no_row(frontpage_location_id):
    result = asyncio.run(
        schema.execute(
            _LOCATION_FRONTPAGE_QUERY,
            variable_values={"id": str(frontpage_location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    data = result.data["location"]["frontpage"]
    assert data["locationId"] == frontpage_location_id
    assert data["tagline"] is None
    assert data["showGuestFavorites"] is True
    assert data["showPopularCombos"] is True
    assert data["favoriteImages"] == []
    assert data["comboImages"] == []


def test_upsert_and_round_trip(frontpage_location_id):
    r1 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "  Guest favorites tonight  ",
                "showGuestFavorites": True,
                "showPopularCombos": False,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not r1.errors
    updated = r1.data["updateLocationFrontpage"]
    assert updated["tagline"] == "Guest favorites tonight"
    assert updated["showGuestFavorites"] is True
    assert updated["showPopularCombos"] is False
    assert updated["favoriteImages"] == []
    assert updated["comboImages"] == []

    r2 = asyncio.run(
        schema.execute(
            _LOCATION_FRONTPAGE_QUERY,
            variable_values={"id": str(frontpage_location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not r2.errors
    data = r2.data["location"]["frontpage"]
    assert data["tagline"] == "Guest favorites tonight"
    assert data["showPopularCombos"] is False

    r3 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "",
                "showGuestFavorites": False,
                "showPopularCombos": True,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not r3.errors
    cleared = r3.data["updateLocationFrontpage"]
    assert cleared["tagline"] is None
    assert cleared["showGuestFavorites"] is False
    assert cleared["showPopularCombos"] is True


def test_upsert_image_overrides_round_trip(frontpage_location_id):
    r1 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "Tonight",
                "showGuestFavorites": True,
                "showPopularCombos": True,
                "favoriteImages": [
                    {"menu": "Burger", "imageFilename": "burger.jpg"},
                    {"menu": "  Burger  ", "imageFilename": "burger-v2.jpg"},
                    {"menu": "Fries", "imageFilename": "fries.png"},
                ],
                "comboImages": [
                    {
                        "menuA": "Burger",
                        "menuB": "Fries",
                        "imageFilename": "combo-1.jpg",
                    },
                    {
                        "menuA": "Fries",
                        "menuB": "Burger",
                        "imageFilename": "combo-2.jpg",
                    },
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not r1.errors
    updated = r1.data["updateLocationFrontpage"]
    assert updated["favoriteImages"] == [
        {
            "menu": "Burger",
            "imageFilename": "burger-v2.jpg",
            "description": None,
            "published": True,
        },
        {
            "menu": "Fries",
            "imageFilename": "fries.png",
            "description": None,
            "published": True,
        },
    ]
    assert updated["comboImages"] == [
        {
            "menuA": "Burger",
            "menuB": "Fries",
            "imageFilename": "combo-2.jpg",
            "description": None,
            "published": True,
        },
    ]

    r2 = asyncio.run(
        schema.execute(
            _LOCATION_FRONTPAGE_QUERY,
            variable_values={"id": str(frontpage_location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not r2.errors
    data = r2.data["location"]["frontpage"]
    assert data["favoriteImages"] == updated["favoriteImages"]
    assert data["comboImages"] == updated["comboImages"]

    # Omitting image args must not wipe existing overrides.
    r3 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "Updated",
                "showGuestFavorites": True,
                "showPopularCombos": True,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not r3.errors
    kept = r3.data["updateLocationFrontpage"]
    assert kept["tagline"] == "Updated"
    assert kept["favoriteImages"] == updated["favoriteImages"]
    assert kept["comboImages"] == updated["comboImages"]

    # Empty lists clear overrides.
    r4 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "Updated",
                "showGuestFavorites": True,
                "showPopularCombos": True,
                "favoriteImages": [],
                "comboImages": [],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not r4.errors
    cleared = r4.data["updateLocationFrontpage"]
    assert cleared["favoriteImages"] == []
    assert cleared["comboImages"] == []


def test_upsert_description_overrides_round_trip(frontpage_location_id):
    r1 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "Tonight",
                "showGuestFavorites": True,
                "showPopularCombos": True,
                "favoriteImages": [
                    {
                        "menu": "Burger",
                        "imageFilename": "burger.jpg",
                        "description": "  Our classic smash  ",
                    },
                    {"menu": "Salad", "description": "Description only"},
                ],
                "comboImages": [
                    {
                        "menuA": "Burger",
                        "menuB": "Fries",
                        "description": "Guest favorite pair",
                    },
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not r1.errors
    updated = r1.data["updateLocationFrontpage"]
    assert updated["favoriteImages"] == [
        {
            "menu": "Burger",
            "imageFilename": "burger.jpg",
            "description": "Our classic smash",
            "published": True,
        },
        {
            "menu": "Salad",
            "imageFilename": None,
            "description": "Description only",
            "published": True,
        },
    ]
    assert updated["comboImages"] == [
        {
            "menuA": "Burger",
            "menuB": "Fries",
            "imageFilename": None,
            "description": "Guest favorite pair",
            "published": True,
        },
    ]


def test_upsert_unpublished_overrides_round_trip(frontpage_location_id):
    r1 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "Tonight",
                "showGuestFavorites": True,
                "showPopularCombos": True,
                "favoriteImages": [
                    {"menu": "Burger", "published": False},
                    {"menu": "Fries", "imageFilename": "fries.png", "published": False},
                ],
                "comboImages": [
                    {"menuA": "Burger", "menuB": "Fries", "published": False},
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not r1.errors
    updated = r1.data["updateLocationFrontpage"]
    assert updated["favoriteImages"] == [
        {
            "menu": "Burger",
            "imageFilename": None,
            "description": None,
            "published": False,
        },
        {
            "menu": "Fries",
            "imageFilename": "fries.png",
            "description": None,
            "published": False,
        },
    ]
    assert updated["comboImages"] == [
        {
            "menuA": "Burger",
            "menuB": "Fries",
            "imageFilename": None,
            "description": None,
            "published": False,
        },
    ]


def test_mutation_drops_empty_favorite_override(frontpage_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "Hello",
                "showGuestFavorites": True,
                "showPopularCombos": True,
                "favoriteImages": [{"menu": "Burger", "imageFilename": "  "}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    assert result.data["updateLocationFrontpage"]["favoriteImages"] == []


def test_mutation_rejects_long_description(frontpage_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "Hello",
                "showGuestFavorites": True,
                "showPopularCombos": True,
                "favoriteImages": [{"menu": "Burger", "description": "x" * 513}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "description must be at most 512" in result.errors[0].message


def test_mutation_rejects_long_tagline(frontpage_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "x" * 513,
                "showGuestFavorites": True,
                "showPopularCombos": True,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "tagline must be at most 512" in result.errors[0].message


def test_mutation_rejects_unauthenticated(frontpage_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": frontpage_location_id,
                "tagline": "Hello",
                "showGuestFavorites": True,
                "showPopularCombos": True,
            },
            context_value={},
        )
    )
    assert result.errors
    assert "Missing authenticated user" in result.errors[0].message


def test_mutation_rejects_non_owner():
    session = SessionLocal()
    try:
        loc = Location(name="Frontpage Other Owner", clerk_user_id="clerk_other_user")
        session.add(loc)
        session.commit()
        session.refresh(loc)
        lid = loc.id
    finally:
        session.close()

    try:
        result = asyncio.run(
            schema.execute(
                _MUTATION,
                variable_values={
                    "locationId": lid,
                    "tagline": "Hello",
                    "showGuestFavorites": True,
                    "showPopularCombos": True,
                },
                context_value=graphql_auth_context(),
            )
        )
        assert result.errors
    finally:
        session = SessionLocal()
        try:
            session.query(LocationFrontpage).filter(LocationFrontpage.location_id == lid).delete()
            session.query(Location).filter(Location.id == lid).delete()
            session.commit()
        finally:
            session.close()
