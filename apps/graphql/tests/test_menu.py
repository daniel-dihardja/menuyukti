"""Integration tests for location curated menu GraphQL API."""

from __future__ import annotations

import asyncio

from graphql.data_sources import Location, Node, SessionLocal
from graphql.data_sources.models.menu import Menu, MenuItem
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

OTHER_USER_ID = "clerk_other_user"

REPLACE_MENU = """
mutation ReplaceLocationMenuItems($locationId: Int!, $items: [MenuItemInput!]!) {
  replaceLocationMenuItems(locationId: $locationId, items: $items) {
    id
    locationId
    title
    items {
      id
      menuId
      name
      description
      price
      sortOrder
      isAvailable
      imageFilename
    }
  }
}
"""

LOCATION_MENU_QUERY = """
query LocationMenu($locationId: Int!) {
  locationMenu(locationId: $locationId) {
    id
    locationId
    items {
      name
      description
      price
      sortOrder
      isAvailable
      imageFilename
    }
  }
}
"""


def _create_location(name: str, *, clerk_user_id: str = GRAPHQL_TEST_USER_ID) -> int:
    session = SessionLocal()
    try:
        session.query(MenuItem).delete()
        session.query(Menu).delete()
        session.query(Node).delete()
        session.query(Location).filter(Location.clerk_user_id == clerk_user_id).delete()
        if clerk_user_id != GRAPHQL_TEST_USER_ID:
            session.query(Location).filter(Location.clerk_user_id == GRAPHQL_TEST_USER_ID).delete()
        session.commit()

        location = Location(name=name, clerk_user_id=clerk_user_id)
        session.add(location)
        session.commit()
        session.refresh(location)
        return location.id
    finally:
        session.close()


def test_replace_and_query_location_menu():
    location_id = _create_location("Menu Location")
    replace_result = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "items": [
                    {
                        "name": "Espresso",
                        "price": 3.5,
                        "description": "Single shot",
                        "isAvailable": True,
                    },
                    {"name": "Croissant", "price": 4.0},
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not replace_result.errors, replace_result.errors
    menu = replace_result.data["replaceLocationMenuItems"]
    assert menu["locationId"] == location_id
    assert len(menu["items"]) == 2
    assert menu["items"][0]["name"] == "Espresso"
    assert menu["items"][0]["description"] == "Single shot"
    assert menu["items"][0]["price"] == 3.5
    assert menu["items"][0]["sortOrder"] == 0
    assert menu["items"][0]["isAvailable"] is True
    assert menu["items"][1]["name"] == "Croissant"
    assert menu["items"][1]["sortOrder"] == 1

    query_result = asyncio.run(
        schema.execute(
            LOCATION_MENU_QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not query_result.errors, query_result.errors
    loaded = query_result.data["locationMenu"]
    assert loaded is not None
    assert len(loaded["items"]) == 2
    assert loaded["items"][0]["name"] == "Espresso"


def test_replace_clears_items_with_empty_list():
    location_id = _create_location("Clear Menu Location")
    asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "items": [{"name": "Soup", "price": 8.0}],
            },
            context_value=graphql_auth_context(),
        )
    )
    clear_result = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={"locationId": location_id, "items": []},
            context_value=graphql_auth_context(),
        )
    )
    assert not clear_result.errors, clear_result.errors
    assert clear_result.data["replaceLocationMenuItems"]["items"] == []


def test_unauthenticated_replace_fails():
    location_id = _create_location("Auth Menu Location")
    result = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "items": [{"name": "Tea", "price": 2.0}],
            },
            context_value={},
        )
    )
    assert result.errors
    assert any("authenticated" in str(err).lower() for err in result.errors)


def test_non_owner_denied():
    location_id = _create_location("Other Owner Menu", clerk_user_id=OTHER_USER_ID)
    replace_result = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "items": [{"name": "Denied", "price": 1.0}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert replace_result.errors

    query_result = asyncio.run(
        schema.execute(
            LOCATION_MENU_QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not query_result.errors, query_result.errors
    assert query_result.data["locationMenu"] is None


def test_validation_empty_name_and_negative_price():
    location_id = _create_location("Validation Menu")
    empty_name = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "items": [{"name": "  ", "price": 1.0}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert empty_name.errors
    assert any("name" in str(err).lower() for err in empty_name.errors)

    negative_price = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "items": [{"name": "Bad Price", "price": -1.0}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert negative_price.errors
    assert any("price" in str(err).lower() for err in negative_price.errors)


def test_location_menu_null_when_missing():
    location_id = _create_location("No Menu Yet")
    result = asyncio.run(
        schema.execute(
            LOCATION_MENU_QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    assert result.data["locationMenu"] is None


def test_replace_and_query_with_image_filename():
    location_id = _create_location("Menu With Image")
    replace_result = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "items": [
                    {
                        "name": "Latte",
                        "price": 4.5,
                        "imageFilename": "latte.jpg",
                    }
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not replace_result.errors, replace_result.errors
    item = replace_result.data["replaceLocationMenuItems"]["items"][0]
    assert item["imageFilename"] == "latte.jpg"

    query_result = asyncio.run(
        schema.execute(
            LOCATION_MENU_QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not query_result.errors, query_result.errors
    assert query_result.data["locationMenu"]["items"][0]["imageFilename"] == "latte.jpg"


def test_replace_clears_image_filename():
    location_id = _create_location("Clear Image Menu")
    asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "items": [{"name": "Cake", "price": 6.0, "imageFilename": "cake.png"}],
            },
            context_value=graphql_auth_context(),
        )
    )
    clear_result = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "items": [{"name": "Cake", "price": 6.0, "imageFilename": ""}],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not clear_result.errors, clear_result.errors
    assert clear_result.data["replaceLocationMenuItems"]["items"][0]["imageFilename"] is None


def test_validation_image_filename_too_long():
    location_id = _create_location("Long Image Menu")
    result = asyncio.run(
        schema.execute(
            REPLACE_MENU,
            variable_values={
                "locationId": location_id,
                "items": [
                    {
                        "name": "Too Long",
                        "price": 1.0,
                        "imageFilename": "a" * 513,
                    }
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert any("image" in str(err).lower() for err in result.errors)
