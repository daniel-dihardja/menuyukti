"""Integration tests for the operatingProfile GraphQL query.

Uses the existing analytics_run_with_qa_data fixture which populates:
  - Bill QA-B1: Mon 2024-06-03 10:00 (breakfast), revenue 72.0
  - Bill QA-B2: Mon 2024-06-03 14:00 (lunch),     revenue 90.0
  - Bill QA-B3: Fri 2024-06-07 20:00 (dinner),    revenue 23.5

Expected profile:
  - total_orders: 3  (3 unique bills)
  - weekday_share: 1.0  (all 3 bills are Mon/Fri)
  - operating_pattern: "weekday_only"
  - primary_meal_period: "lunch"  (three-way tie on order count; revenue tie-breaker: lunch 90 > breakfast 72 > dinner 23.5)
  - dining_focus: "all_day_dining"  (no period >= 50%; lunch+dinner = 0.667 < 0.70)
  - peak_day: "mon"  (2 bills on Mon vs 1 on Fri)
"""

import asyncio

from graphql.data_sources import AnalyticsRun, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import graphql_auth_context

_OPERATING_PROFILE_QUERY = """
query OperatingProfile($locationId: ID!, $analyticsRunId: ID!) {
  operatingProfile(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    totalOrders
    totalRevenue
    activeDaysCount
    avgDailyOrders
    weekdayShare
    weekendShare
    peakDay
    primaryMealPeriod
    activeMealPeriods
    operatingPattern
    diningFocus
    mealPeriodBreakdown {
      period
      label
      orderCount
      share
      revenue
      revenueShare
    }
    dayOfWeekBreakdown {
      day
      isWeekend
      orderCount
      share
      revenue
      isPeakDay
    }
    dayTypeBreakdown {
      type
      orderCount
      share
      revenue
      revenueShare
    }
  }
}
"""


def _get_location_id(run_id: int) -> int:
    session = SessionLocal()
    try:
        run = session.get(AnalyticsRun, run_id)
        assert run is not None
        return run.location_id
    finally:
        session.close()


def test_operating_profile_returns_expected_values(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data
    location_id = _get_location_id(run_id)

    result = asyncio.run(
        schema.execute(
            _OPERATING_PROFILE_QUERY,
            variable_values={
                "locationId": str(location_id),
                "analyticsRunId": str(run_id),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    profile = result.data["operatingProfile"]
    assert profile is not None

    assert profile["totalOrders"] == 3
    assert abs(profile["totalRevenue"] - 185.5) < 0.01
    assert profile["activeDaysCount"] == 2
    assert abs(profile["avgDailyOrders"] - 1.5) < 1e-4

    assert abs(profile["weekdayShare"] - 1.0) < 1e-4
    assert abs(profile["weekendShare"] - 0.0) < 1e-4
    assert profile["operatingPattern"] == "weekday_only"

    assert profile["peakDay"] == "mon"
    assert profile["primaryMealPeriod"] == "lunch"
    assert set(profile["activeMealPeriods"]) == {"breakfast", "lunch", "dinner"}
    assert profile["diningFocus"] == "all_day_dining"


def test_operating_profile_meal_period_breakdown(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data
    location_id = _get_location_id(run_id)

    result = asyncio.run(
        schema.execute(
            _OPERATING_PROFILE_QUERY,
            variable_values={
                "locationId": str(location_id),
                "analyticsRunId": str(run_id),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    profile = result.data["operatingProfile"]

    by_period = {r["period"]: r for r in profile["mealPeriodBreakdown"]}
    assert set(by_period.keys()) == {"breakfast", "lunch", "afternoon", "dinner", "late_night"}

    breakfast = by_period["breakfast"]
    assert breakfast["orderCount"] == 1
    assert abs(breakfast["share"] - round(1 / 3, 4)) < 1e-3
    assert abs(breakfast["revenue"] - 72.0) < 0.01

    lunch = by_period["lunch"]
    assert lunch["orderCount"] == 1
    assert abs(lunch["revenue"] - 90.0) < 0.01

    dinner = by_period["dinner"]
    assert dinner["orderCount"] == 1
    assert abs(dinner["revenue"] - 23.5) < 0.01

    assert by_period["afternoon"]["orderCount"] == 0
    assert by_period["late_night"]["orderCount"] == 0


def test_operating_profile_day_of_week_breakdown(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data
    location_id = _get_location_id(run_id)

    result = asyncio.run(
        schema.execute(
            _OPERATING_PROFILE_QUERY,
            variable_values={
                "locationId": str(location_id),
                "analyticsRunId": str(run_id),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    profile = result.data["operatingProfile"]

    by_day = {r["day"]: r for r in profile["dayOfWeekBreakdown"]}
    assert set(by_day.keys()) == {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}

    assert by_day["mon"]["orderCount"] == 2
    assert by_day["mon"]["isPeakDay"] is True
    assert by_day["mon"]["isWeekend"] is False
    assert abs(by_day["mon"]["revenue"] - 162.0) < 0.01  # 72 + 90

    assert by_day["fri"]["orderCount"] == 1
    assert by_day["fri"]["isPeakDay"] is False
    assert abs(by_day["fri"]["revenue"] - 23.5) < 0.01

    for d in ["tue", "wed", "thu", "sat", "sun"]:
        assert by_day[d]["orderCount"] == 0


def test_operating_profile_day_type_breakdown(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data
    location_id = _get_location_id(run_id)

    result = asyncio.run(
        schema.execute(
            _OPERATING_PROFILE_QUERY,
            variable_values={
                "locationId": str(location_id),
                "analyticsRunId": str(run_id),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    profile = result.data["operatingProfile"]

    by_type = {r["type"]: r for r in profile["dayTypeBreakdown"]}
    assert by_type["weekday"]["orderCount"] == 3
    assert abs(by_type["weekday"]["share"] - 1.0) < 1e-4
    assert by_type["weekend"]["orderCount"] == 0
    assert abs(by_type["weekend"]["share"] - 0.0) < 1e-4


def test_operating_profile_wrong_location_returns_none(analytics_run_with_qa_data):
    """Returns None when analyticsRunId does not belong to the given locationId."""
    run_id = analytics_run_with_qa_data

    result = asyncio.run(
        schema.execute(
            _OPERATING_PROFILE_QUERY,
            variable_values={
                "locationId": "99999",
                "analyticsRunId": str(run_id),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    assert result.data["operatingProfile"] is None


def test_operating_profile_nonexistent_run_returns_none(analytics_run_with_qa_data):
    """Returns None when analyticsRunId does not exist."""
    run_id = analytics_run_with_qa_data
    location_id = _get_location_id(run_id)

    result = asyncio.run(
        schema.execute(
            _OPERATING_PROFILE_QUERY,
            variable_values={
                "locationId": str(location_id),
                "analyticsRunId": "99999",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    assert result.data["operatingProfile"] is None
