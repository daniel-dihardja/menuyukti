"""Tests for igPlanInputs composite GraphQL query."""

from __future__ import annotations

import asyncio
from datetime import time

from graphql.data_sources import AnalyticsRun, Location, LocationOpeningHour, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

_QUERY = """
query IgPlanInputs($locationId: Int!, $options: IgPlanInputsOptionsInput) {
  igPlanInputs(locationId: $locationId, options: $options) {
    version
    coverageNotes
    location {
      id
      name
      city
      country
      currency
      openingHours {
        dayOfWeek
        openTime
        closeTime
      }
      manualBriefInput {
        locationId
        quickProfile
      }
    }
    analyticsRun {
      id
      name
    }
    slotDemandProfile {
      day
      mealPeriod
      demandIndex
      relativeDemand
    }
    menuEngineeringMatrix {
      thresholds {
        avgPopularity
        avgContributionMargin
      }
      items {
        menu
        category
      }
    }
    slotMenuCandidates {
      reportingPeriod
      matrixAvailable
      slots {
        day
        mealPeriod
        candidates {
          menu
          globalCategory
          rank
        }
      }
    }
  }
}
"""


def _location_id(run_id: int) -> int:
    session = SessionLocal()
    try:
        run = session.get(AnalyticsRun, run_id)
        assert run is not None
        return run.location_id
    finally:
        session.close()


def test_ig_plan_inputs_unauthorized_returns_null() -> None:
    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={"locationId": 999999},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    assert result.data["igPlanInputs"] is None


def test_ig_plan_inputs_with_qa_data(analytics_run_with_qa_data: int) -> None:
    run_id = analytics_run_with_qa_data
    location_id = _location_id(run_id)

    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={
                "locationId": location_id,
                "options": {
                    "includeLowEnd": False,
                    "maxCandidatesPerSlot": 5,
                    "matrixCategories": ["star", "plow_horse", "puzzle"],
                },
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["igPlanInputs"]
    assert payload is not None
    assert payload["version"] == 1
    assert payload["location"]["id"] == str(location_id)
    assert payload["analyticsRun"]["id"] == str(run_id)
    assert len(payload["slotDemandProfile"]) == 35
    assert payload["menuEngineeringMatrix"] is not None
    assert payload["slotMenuCandidates"] is not None
    assert payload["slotMenuCandidates"]["matrixAvailable"] is True
    matrix_categories = {item["category"] for item in payload["menuEngineeringMatrix"]["items"]}
    assert matrix_categories.issubset({"star", "plow_horse", "puzzle"})
    assert len(payload["slotMenuCandidates"]["slots"]) > 0


def test_ig_plan_inputs_location_without_run_returns_profile_only() -> None:
    session = SessionLocal()
    try:
        location = Location(
            name="IG Plan Test Venue",
            street="1 Test St",
            city="Testville",
            country="NL",
            currency="EUR",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
        )
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["igPlanInputs"]
    assert payload is not None
    assert payload["location"]["name"] == "IG Plan Test Venue"
    assert payload["analyticsRun"] is None
    assert payload["slotDemandProfile"] == []
    assert payload["menuEngineeringMatrix"] is None
    assert payload["slotMenuCandidates"] is None
    assert any("No analytics run" in note for note in payload["coverageNotes"])


def test_ig_plan_inputs_returns_opening_hours() -> None:
    session = SessionLocal()
    try:
        location = Location(
            name="Hours Test Venue",
            street="2 Hours St",
            city="Testville",
            country="NL",
            currency="EUR",
            clerk_user_id=GRAPHQL_TEST_USER_ID,
        )
        session.add(location)
        session.flush()
        session.add(
            LocationOpeningHour(
                location_id=location.id,
                day_of_week="wednesday",
                open_time=time(hour=12, minute=0),
                close_time=time(hour=21, minute=30),
            )
        )
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={"locationId": location_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors, result.errors
    payload = result.data["igPlanInputs"]
    assert payload is not None
    hours = payload["location"]["openingHours"]
    assert len(hours) == 1
    assert hours[0]["dayOfWeek"] == "wednesday"
    assert hours[0]["openTime"] == "12:00"
    assert hours[0]["closeTime"] == "21:30"
