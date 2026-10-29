"""Tests for nested location.advisorMemory and updateLocationAdvisorMemory mutation."""

from __future__ import annotations

import asyncio

import pytest

from graphql.data_sources import Location, LocationAdvisorMemory, SessionLocal
from graphql.domain.advisor_memory import ADVISOR_MEMORY_MAX_CHARS, normalize_advisor_memory_content
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_LOCATION_MEMORY_QUERY = """
query LocationMemory($id: ID!) {
  location(id: $id) {
    id
    advisorMemory {
      locationId
      content
      updatedAt
    }
  }
}
"""

_MUTATION = """
mutation UpdateAdvisorMemory($locationId: Int!, $content: String!) {
  updateLocationAdvisorMemory(locationId: $locationId, content: $content) {
    locationId
    content
    updatedAt
  }
}
"""


@pytest.fixture
def advisor_memory_location_id():
    session = SessionLocal()
    try:
        loc = Location(name="Advisor Memory Test Loc", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(loc)
        session.commit()
        session.refresh(loc)
        lid = loc.id
    finally:
        session.close()
    yield lid
    session = SessionLocal()
    try:
        session.query(LocationAdvisorMemory).filter(
            LocationAdvisorMemory.location_id == lid
        ).delete()
        session.query(Location).filter(Location.id == lid).delete()
        session.commit()
    finally:
        session.close()


def test_normalize_advisor_memory_content():
    assert normalize_advisor_memory_content("  hello  ") == "hello"
    assert normalize_advisor_memory_content("") == ""
    assert normalize_advisor_memory_content("   ") == ""
    with pytest.raises(ValueError, match="must be a string"):
        normalize_advisor_memory_content(123)  # type: ignore[arg-type]
    with pytest.raises(ValueError, match="at most"):
        normalize_advisor_memory_content("x" * (ADVISOR_MEMORY_MAX_CHARS + 1))


def test_query_returns_empty_when_no_row(advisor_memory_location_id):
    result = asyncio.run(
        schema.execute(
            _LOCATION_MEMORY_QUERY,
            variable_values={"id": str(advisor_memory_location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    data = result.data["location"]["advisorMemory"]
    assert data["locationId"] == advisor_memory_location_id
    assert data["content"] == ""
    assert data["updatedAt"] is None


def test_upsert_and_clear(advisor_memory_location_id):
    note = "Do not promote lunch specials."
    r1 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={"locationId": advisor_memory_location_id, "content": note},
            context_value=graphql_auth_context(),
        )
    )
    assert not r1.errors, r1.errors
    payload = r1.data["updateLocationAdvisorMemory"]
    assert payload["locationId"] == advisor_memory_location_id
    assert payload["content"] == note
    assert payload["updatedAt"] is not None

    r2 = asyncio.run(
        schema.execute(
            _LOCATION_MEMORY_QUERY,
            variable_values={"id": str(advisor_memory_location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not r2.errors, r2.errors
    assert r2.data["location"]["advisorMemory"]["content"] == note

    r3 = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={"locationId": advisor_memory_location_id, "content": ""},
            context_value=graphql_auth_context(),
        )
    )
    assert not r3.errors, r3.errors
    assert r3.data["updateLocationAdvisorMemory"]["content"] == ""
    assert r3.data["updateLocationAdvisorMemory"]["updatedAt"] is None

    session = SessionLocal()
    try:
        row = (
            session.query(LocationAdvisorMemory)
            .filter(LocationAdvisorMemory.location_id == advisor_memory_location_id)
            .first()
        )
        assert row is None
    finally:
        session.close()


def test_mutation_rejects_oversized_content(advisor_memory_location_id):
    result = asyncio.run(
        schema.execute(
            _MUTATION,
            variable_values={
                "locationId": advisor_memory_location_id,
                "content": "x" * (ADVISOR_MEMORY_MAX_CHARS + 1),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert result.errors
    assert "at most" in str(result.errors[0])


def test_non_owner_nested_field_is_null(advisor_memory_location_id):
    session = SessionLocal()
    try:
        other = Location(name="Other Owner Loc", clerk_user_id="clerk_other_user")
        session.add(other)
        session.commit()
        session.refresh(other)
        other_id = other.id
        session.add(
            LocationAdvisorMemory(
                location_id=other_id,
                content="secret memory",
            )
        )
        session.commit()
    finally:
        session.close()

    try:
        result = asyncio.run(
            schema.execute(
                _LOCATION_MEMORY_QUERY,
                variable_values={"id": str(other_id)},
                context_value=graphql_auth_context(),
            )
        )
        assert not result.errors, result.errors
        # Parent location() returns null for non-owners
        assert result.data["location"] is None

        denied = asyncio.run(
            schema.execute(
                _MUTATION,
                variable_values={"locationId": other_id, "content": "hack"},
                context_value=graphql_auth_context(),
            )
        )
        assert denied.errors
        assert "Access denied" in str(denied.errors[0]) or "denied" in str(denied.errors[0]).lower()
    finally:
        session = SessionLocal()
        try:
            session.query(LocationAdvisorMemory).filter(
                LocationAdvisorMemory.location_id == other_id
            ).delete()
            session.query(Location).filter(Location.id == other_id).delete()
            session.commit()
        finally:
            session.close()
