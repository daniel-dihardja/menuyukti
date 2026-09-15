"""Tests for publicLocationWall and wall enablement on updateLocationFrontpage."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import Location, LocationFrontpage, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_PUBLIC_WALL_QUERY = """
query PublicWall($slug: String!) {
  publicLocationWall(slug: $slug) {
    locationId
    name
    tagline
    publicSlug
    workspaceId
    mediaOwnerClerkUserId
    tiles {
      kind
      key
      title
      description
      imageFilename
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
  $wallEnabled: Boolean
  $publicSlug: String
) {
  updateLocationFrontpage(
    locationId: $locationId
    tagline: $tagline
    showGuestFavorites: $showGuestFavorites
    showPopularCombos: $showPopularCombos
    wallEnabled: $wallEnabled
    publicSlug: $publicSlug
  ) {
    locationId
    tagline
    showGuestFavorites
    showPopularCombos
    wallEnabled
  }
}
"""


@pytest.fixture
def wall_location_id():
    session = SessionLocal()
    try:
        loc = Location(
            name="Wall Test Loc",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            public_slug=None,
        )
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


def test_public_wall_null_when_missing_or_disabled(wall_location_id):
    result = asyncio.run(
        schema.execute(
            _PUBLIC_WALL_QUERY,
            variable_values={"slug": "does-not-exist"},
            context_value={},
        )
    )
    assert result.errors is None
    assert result.data["publicLocationWall"] is None

    # Slug set but wall not enabled → still null
    session = SessionLocal()
    try:
        loc = session.get(Location, wall_location_id)
        assert loc is not None
        loc.public_slug = "wall-test-loc"
        session.add(
            LocationFrontpage(
                location_id=wall_location_id,
                tagline="Hello",
                wall_enabled=False,
            )
        )
        session.commit()
    finally:
        session.close()

    result2 = asyncio.run(
        schema.execute(
            _PUBLIC_WALL_QUERY,
            variable_values={"slug": "wall-test-loc"},
            context_value={},
        )
    )
    assert result2.errors is None
    assert result2.data["publicLocationWall"] is None


def test_public_wall_returns_curated_spine_when_enabled(wall_location_id):
    session = SessionLocal()
    try:
        loc = session.get(Location, wall_location_id)
        assert loc is not None
        loc.public_slug = "wall-enabled-loc"
        session.add(
            LocationFrontpage(
                location_id=wall_location_id,
                tagline="Tonight",
                wall_enabled=True,
                show_guest_favorites=True,
                show_popular_combos=True,
                favorite_images=[],
                combo_images=[],
            )
        )
        session.commit()
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _PUBLIC_WALL_QUERY,
            variable_values={"slug": "wall-enabled-loc"},
            context_value={},
        )
    )
    assert result.errors is None
    wall = result.data["publicLocationWall"]
    assert wall is not None
    assert wall["name"] == "Wall Test Loc"
    assert wall["tagline"] == "Tonight"
    assert wall["publicSlug"] == "wall-enabled-loc"
    assert wall["tiles"] == []
    assert wall["mediaOwnerClerkUserId"] == GRAPHQL_TEST_USER_ID


def test_enable_wall_requires_slug(wall_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": wall_location_id,
                "tagline": None,
                "showGuestFavorites": True,
                "showPopularCombos": True,
                "wallEnabled": True,
                "publicSlug": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "publicSlug is required" in result.errors[0].message


def test_enable_wall_round_trip(wall_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": wall_location_id,
                "tagline": "Guest home",
                "showGuestFavorites": True,
                "showPopularCombos": True,
                "wallEnabled": True,
                "publicSlug": "My Cool Place",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None
    assert result.data["updateLocationFrontpage"]["wallEnabled"] is True

    session = SessionLocal()
    try:
        loc = session.get(Location, wall_location_id)
        assert loc is not None
        assert loc.public_slug == "my-cool-place"
    finally:
        session.close()

    public = asyncio.run(
        schema.execute(
            _PUBLIC_WALL_QUERY,
            variable_values={"slug": "my-cool-place"},
            context_value={},
        )
    )
    assert public.errors is None
    assert public.data["publicLocationWall"]["tagline"] == "Guest home"


def test_public_wall_hides_unpublished_override_without_analytics(wall_location_id):
    """Without analytics runs, tiles are empty even with unpublished overrides stored."""
    session = SessionLocal()
    try:
        loc = session.get(Location, wall_location_id)
        assert loc is not None
        loc.public_slug = "wall-unpublished"
        session.add(
            LocationFrontpage(
                location_id=wall_location_id,
                tagline=None,
                wall_enabled=True,
                favorite_images=[{"menu": "Burger", "published": False}],
            )
        )
        session.commit()
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _PUBLIC_WALL_QUERY,
            variable_values={"slug": "wall-unpublished"},
            context_value={},
        )
    )
    assert result.errors is None
    assert result.data["publicLocationWall"]["tiles"] == []
