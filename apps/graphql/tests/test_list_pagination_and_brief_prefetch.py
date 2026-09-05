"""Tests for list pagination clamps and manual-brief prefetch."""

from __future__ import annotations

from unittest import mock

import pytest
from graphql.data_sources import Location, LocationManualBriefInput, SessionLocal
from graphql.schema import schema
from graphql.schema.queries.location_manual_brief_input import load_manual_brief_type
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context


@pytest.fixture
def two_brief_locations():
    session = SessionLocal()
    lids: list[int] = []
    try:
        for name in ("Brief Prefetch A", "Brief Prefetch B"):
            loc = Location(name=name, clerk_user_id=GRAPHQL_TEST_USER_ID)
            session.add(loc)
            session.flush()
            session.add(
                LocationManualBriefInput(
                    location_id=loc.id,
                    quick_profile={"instagramHandle": name.lower().replace(" ", "")},
                )
            )
            lids.append(loc.id)
        session.commit()
    finally:
        session.close()
    yield lids
    session = SessionLocal()
    try:
        for lid in lids:
            session.query(LocationManualBriefInput).filter(
                LocationManualBriefInput.location_id == lid
            ).delete()
            session.query(Location).filter(Location.id == lid).delete()
        session.commit()
    finally:
        session.close()


def test_styles_respects_first_clamp():
    result = schema.execute_sync(
        """
        query {
          styles(first: 1) { id }
        }
        """,
        context_value=graphql_auth_context(),
    )
    assert result.errors is None
    assert result.data is not None
    assert len(result.data["styles"]) <= 1


def test_locations_manual_brief_uses_prefetch_cache(two_brief_locations):
    """Nested manualBriefInput should not call load_manual_brief_type per location."""
    with mock.patch(
        "graphql.schema.queries.location_manual_brief_input.load_manual_brief_type",
        wraps=load_manual_brief_type,
    ) as mocked_load:
        result = schema.execute_sync(
            """
            query {
              locations(first: 10) {
                id
                manualBriefInput { locationId quickProfile }
              }
            }
            """,
            context_value=graphql_auth_context(),
        )
        assert result.errors is None, result.errors
        assert result.data is not None
        locations = result.data["locations"]
        assert len(locations) >= 2
        # Prefetch should satisfy nested fields; lazy loader must not run.
        assert mocked_load.call_count == 0
        by_id = {int(loc["id"]): loc for loc in locations}
        for lid in two_brief_locations:
            assert lid in by_id
            brief = by_id[lid]["manualBriefInput"]
            assert brief is not None
            assert brief["locationId"] == lid
