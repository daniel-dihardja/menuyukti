"""Tests for publicLocationMenu and updateLocationPublicMenu."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import Location, LocationFrontpage, SessionLocal
from graphql.data_sources.models.menu import Menu, MenuCategory, MenuItem
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_PUBLIC_MENU_QUERY = """
query PublicMenu($slug: String!) {
  publicLocationMenu(slug: $slug) {
    locationId
    name
    tagline
    publicSlug
    currency
    workspaceId
    mediaOwnerClerkUserId
    categories {
      name
      sortOrder
      items {
        name
        price
        sortOrder
        description
        imageFilename
      }
    }
  }
}
"""

_MUTATION = """
mutation UpdatePublicMenu(
  $locationId: Int!
  $publicEnabled: Boolean
  $publicSlug: String
) {
  updateLocationPublicMenu(
    locationId: $locationId
    publicEnabled: $publicEnabled
    publicSlug: $publicSlug
  ) {
    locationId
    publicEnabled
    publicSlug
    menu {
      id
      locationId
      publicEnabled
    }
  }
}
"""


@pytest.fixture
def menu_location_id():
    session = SessionLocal()
    try:
        loc = Location(
            name="Menu Pub Loc",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
            currency="EUR",
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
        session.query(MenuItem).filter(
            MenuItem.menu_id.in_(session.query(Menu.id).filter(Menu.location_id == lid))
        ).delete(synchronize_session=False)
        session.query(MenuCategory).filter(
            MenuCategory.menu_id.in_(session.query(Menu.id).filter(Menu.location_id == lid))
        ).delete(synchronize_session=False)
        session.query(Menu).filter(Menu.location_id == lid).delete()
        session.query(LocationFrontpage).filter(LocationFrontpage.location_id == lid).delete()
        session.query(Location).filter(Location.id == lid).delete()
        session.commit()
    finally:
        session.close()


def test_public_menu_null_when_missing_or_disabled(menu_location_id):
    result = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "does-not-exist"},
            context_value={},
        )
    )
    assert result.errors is None
    assert result.data["publicLocationMenu"] is None

    session = SessionLocal()
    try:
        loc = session.get(Location, menu_location_id)
        assert loc is not None
        loc.public_slug = "menu-test-loc"
        session.add(Menu(location_id=menu_location_id, title="", public_enabled=False))
        session.commit()
    finally:
        session.close()

    result2 = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "menu-test-loc"},
            context_value={},
        )
    )
    assert result2.errors is None
    assert result2.data["publicLocationMenu"] is None


def test_public_menu_hides_unavailable_items(menu_location_id):
    session = SessionLocal()
    try:
        loc = session.get(Location, menu_location_id)
        assert loc is not None
        loc.public_slug = "menu-available-loc"
        session.add(
            LocationFrontpage(
                location_id=menu_location_id,
                tagline="Lunch",
            )
        )
        menu = Menu(location_id=menu_location_id, title="", public_enabled=True)
        session.add(menu)
        session.flush()
        cat = MenuCategory(menu_id=menu.id, name="Drinks", sort_order=0)
        session.add(cat)
        session.flush()
        session.add_all(
            [
                MenuItem(
                    menu_id=menu.id,
                    category_id=cat.id,
                    name="Espresso",
                    description="Double shot",
                    price=2.5,
                    sort_order=0,
                    is_available=True,
                    image_filename="espresso.webp",
                ),
                MenuItem(
                    menu_id=menu.id,
                    category_id=cat.id,
                    name="Sold Out Latte",
                    description="Oat milk",
                    price=4.0,
                    sort_order=1,
                    is_available=False,
                    image_filename="latte.webp",
                ),
            ]
        )
        session.commit()
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "menu-available-loc"},
            context_value={},
        )
    )
    assert result.errors is None
    pub = result.data["publicLocationMenu"]
    assert pub is not None
    assert pub["name"] == "Menu Pub Loc"
    assert pub["tagline"] == "Lunch"
    assert pub["currency"] == "EUR"
    assert pub["mediaOwnerClerkUserId"] == GRAPHQL_TEST_USER_ID
    assert pub["workspaceId"] is None
    assert len(pub["categories"]) == 1
    items = pub["categories"][0]["items"]
    assert [item["name"] for item in items] == ["Espresso"]
    assert items[0]["description"] == "Double shot"
    assert items[0]["imageFilename"] == "espresso.webp"


def test_enable_public_menu_requires_slug(menu_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "publicEnabled": True,
                "publicSlug": None,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "publicSlug is required" in result.errors[0].message


def test_enable_public_menu_round_trip(menu_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": menu_location_id,
                "publicEnabled": True,
                "publicSlug": "My Cool Cafe",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors is None
    payload = result.data["updateLocationPublicMenu"]
    assert payload["publicEnabled"] is True
    assert payload["publicSlug"] == "my-cool-cafe"
    assert payload["menu"]["publicEnabled"] is True

    public = asyncio.run(
        schema.execute(
            _PUBLIC_MENU_QUERY,
            variable_values={"slug": "my-cool-cafe"},
            context_value={},
        )
    )
    assert public.errors is None
    assert public.data["publicLocationMenu"]["name"] == "Menu Pub Loc"
    assert public.data["publicLocationMenu"]["categories"] == []
