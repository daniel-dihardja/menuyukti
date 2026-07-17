"""Tests for locationStyles / locationStyle queries and style CRUD mutations."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import Location, LocationStyle, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_LIST_QUERY = """
query LocationStyles($locationId: Int!) {
  locationStyles(locationId: $locationId) {
    id
    locationId
    name
    rules
    referenceImageName
    isDefault
  }
}
"""

_ONE_QUERY = """
query LocationStyle($id: Int!) {
  locationStyle(id: $id) {
    id
    locationId
    name
    rules
    referenceImageName
    isDefault
  }
}
"""

_CREATE = """
mutation CreateStyle(
  $locationId: Int!
  $name: String!
  $rules: String!
  $referenceImageName: String!
  $isDefault: Boolean
) {
  createLocationStyle(
    locationId: $locationId
    name: $name
    rules: $rules
    referenceImageName: $referenceImageName
    isDefault: $isDefault
  ) {
    id
    locationId
    name
    rules
    referenceImageName
    isDefault
  }
}
"""

_UPDATE = """
mutation UpdateStyle(
  $id: Int!
  $name: String
  $rules: String
  $referenceImageName: String
  $isDefault: Boolean
) {
  updateLocationStyle(
    id: $id
    name: $name
    rules: $rules
    referenceImageName: $referenceImageName
    isDefault: $isDefault
  ) {
    id
    name
    rules
    referenceImageName
    isDefault
  }
}
"""

_DELETE = """
mutation DeleteStyle($id: Int!) {
  deleteLocationStyle(id: $id)
}
"""


@pytest.fixture
def style_location_id():
    session = SessionLocal()
    try:
        loc = Location(name="Style Pack Test Loc", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(loc)
        session.commit()
        session.refresh(loc)
        lid = loc.id
    finally:
        session.close()
    yield lid
    session = SessionLocal()
    try:
        session.query(LocationStyle).filter(LocationStyle.location_id == lid).delete()
        session.query(Location).filter(Location.id == lid).delete()
        session.commit()
    finally:
        session.close()


def _execute(query: str, variable_values: dict, context_value: dict | None = None):
    return asyncio.run(
        schema.execute(
            query,
            variable_values=variable_values,
            context_value=context_value if context_value is not None else graphql_auth_context(),
        )
    )


def test_list_empty_for_owner(style_location_id: int):
    result = _execute(_LIST_QUERY, {"locationId": style_location_id})
    assert result.errors is None
    assert result.data["locationStyles"] == []


def test_list_denied_without_auth(style_location_id: int):
    result = _execute(_LIST_QUERY, {"locationId": style_location_id}, context_value={})
    assert result.errors is None
    assert result.data["locationStyles"] == []


def test_create_update_delete_and_default_exclusivity(style_location_id: int):
    created_a = _execute(
        _CREATE,
        {
            "locationId": style_location_id,
            "name": "Warm editorial",
            "rules": "Warm window light; soft shadows.",
            "referenceImageName": "warm-ref.webp",
            "isDefault": True,
        },
    )
    assert created_a.errors is None
    style_a = created_a.data["createLocationStyle"]
    assert style_a["isDefault"] is True
    assert style_a["referenceImageName"] == "warm-ref.webp"
    id_a = style_a["id"]

    created_b = _execute(
        _CREATE,
        {
            "locationId": style_location_id,
            "name": "Cool neon",
            "rules": "Cool cyan accents; high contrast.",
            "referenceImageName": "cool-ref.webp",
            "isDefault": True,
        },
    )
    assert created_b.errors is None
    style_b = created_b.data["createLocationStyle"]
    assert style_b["isDefault"] is True
    id_b = style_b["id"]

    listed = _execute(_LIST_QUERY, {"locationId": style_location_id})
    assert listed.errors is None
    by_id = {row["id"]: row for row in listed.data["locationStyles"]}
    assert by_id[id_a]["isDefault"] is False
    assert by_id[id_b]["isDefault"] is True

    updated = _execute(
        _UPDATE,
        {
            "id": id_a,
            "name": "Warm editorial v2",
            "isDefault": True,
        },
    )
    assert updated.errors is None
    assert updated.data["updateLocationStyle"]["name"] == "Warm editorial v2"
    assert updated.data["updateLocationStyle"]["isDefault"] is True

    listed2 = _execute(_LIST_QUERY, {"locationId": style_location_id})
    by_id2 = {row["id"]: row for row in listed2.data["locationStyles"]}
    assert by_id2[id_a]["isDefault"] is True
    assert by_id2[id_b]["isDefault"] is False

    one = _execute(_ONE_QUERY, {"id": id_a})
    assert one.errors is None
    assert one.data["locationStyle"]["name"] == "Warm editorial v2"

    deleted = _execute(_DELETE, {"id": id_b})
    assert deleted.errors is None
    assert deleted.data["deleteLocationStyle"] is True

    listed3 = _execute(_LIST_QUERY, {"locationId": style_location_id})
    assert len(listed3.data["locationStyles"]) == 1
    assert listed3.data["locationStyles"][0]["id"] == id_a


def test_create_requires_fields(style_location_id: int):
    result = _execute(
        _CREATE,
        {
            "locationId": style_location_id,
            "name": "  ",
            "rules": "rules",
            "referenceImageName": "a.webp",
        },
    )
    assert result.errors is not None
    assert any("Name is required" in str(err) for err in result.errors)


def test_get_one_denied_for_other_user(style_location_id: int):
    created = _execute(
        _CREATE,
        {
            "locationId": style_location_id,
            "name": "Private",
            "rules": "rules",
            "referenceImageName": "p.webp",
        },
    )
    assert created.errors is None
    style_id = created.data["createLocationStyle"]["id"]

    denied = _execute(
        _ONE_QUERY,
        {"id": style_id},
        context_value={"user_id": "someone_else"},
    )
    assert denied.errors is None
    assert denied.data["locationStyle"] is None
