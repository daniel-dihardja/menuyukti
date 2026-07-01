"""Tests for latestAnalyticsRunWithSignals GraphQL query."""

from graphql.data_sources import AnalyticsRun, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import graphql_auth_context

LATEST_ANALYTICS_RUN_WITH_SIGNALS_QUERY = """
query LatestAnalyticsRunWithSignals($locationId: Int!) {
  latestAnalyticsRunWithSignals(locationId: $locationId) {
    analyticsRun {
      id
      name
    }
    instagramSignals {
      capabilities {
        hasDatetime
      }
    }
    slotDemandProfile {
      day
      mealPeriod
      demandIndex
      relativeDemand
    }
  }
}
"""


def test_latest_analytics_run_with_signals_unauthorized_returns_null():
    result = schema.execute_sync(
        LATEST_ANALYTICS_RUN_WITH_SIGNALS_QUERY,
        variable_values={"locationId": 999999},
        context_value=graphql_auth_context(),
    )
    assert result.errors is None
    assert result.data["latestAnalyticsRunWithSignals"] is None


def test_latest_analytics_run_with_signals_includes_slot_profile(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data
    session = SessionLocal()
    try:
        run = session.get(AnalyticsRun, run_id)
        assert run is not None
        location_id = run.location_id
    finally:
        session.close()

    result = schema.execute_sync(
        LATEST_ANALYTICS_RUN_WITH_SIGNALS_QUERY,
        variable_values={"locationId": location_id},
        context_value=graphql_auth_context(),
    )
    assert result.errors is None, result.errors
    payload = result.data["latestAnalyticsRunWithSignals"]
    assert payload is not None
    assert payload["analyticsRun"]["id"] == str(run_id)
    assert payload["instagramSignals"] is not None
    assert len(payload["slotDemandProfile"]) == 35
