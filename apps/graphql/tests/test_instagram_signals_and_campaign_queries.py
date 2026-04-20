"""Integration tests for instagramSignals, categoryMix, and revenueTrends queries."""

import asyncio

from graphql.data_sources import AnalyticsRun, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import graphql_auth_context

_INSTAGRAM_SIGNALS_QUERY = """
query InstagramSignals($locationId: ID!, $analyticsRunId: ID!) {
  instagramSignals(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    analyticsRunId
    periodHeadline {
      periodStart
      periodEnd
      totalRevenue
      previousPeriodTotalRevenue
      revenueVsPreviousPct
    }
    bestPostingWindow {
      peakDay
      peakHour
      primaryMealPeriod
    }
    contentHeroes {
      menu
      matrixCategory
    }
  }
}
"""

_CATEGORY_MIX_QUERY = """
query CategoryMix($locationId: ID!, $analyticsRunId: ID!) {
  categoryMix(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    analyticsRunId
    topRevenueCategory
    rows {
      category
      revenue
      quantity
      revenueShare
      quantityShare
      topItem
    }
  }
}
"""

_REVENUE_TRENDS_QUERY = """
query RevenueTrends($locationId: ID!, $analyticsRunId: ID!) {
  revenueTrends(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    analyticsRunId
    currentPeriodTotalRevenue
    previousPeriodTotalRevenue
    rows {
      menu
      trendLabel
      currentRevenue
    }
  }
}
"""

_PROMOTION_CANDIDATES_SIGNALS_QUERY = """
query PromotionCandidatesSignals($locationId: ID!, $analyticsRunId: ID!) {
  promotionCandidatesSignals(locationId: $locationId, analyticsRunId: $analyticsRunId) {
    analyticsRunId
    itemsTotalCount
    itemsTruncated
    bestPostingWindowSummary
    puzzleOpportunityPool {
      puzzleItemsFound
      selectedCount
    }
    rankedCandidatesTotalCount
    rankedCandidates {
      menu
      recommendation
      score
      quantity
      totalRevenue
      signalReasons
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


def test_instagram_signals_category_mix_revenue_trends(analytics_run_with_qa_data: int) -> None:
    run_id = analytics_run_with_qa_data
    location_id = _get_location_id(run_id)
    vars_common = {
        "locationId": str(location_id),
        "analyticsRunId": str(run_id),
    }

    r1 = asyncio.run(
        schema.execute(
            _INSTAGRAM_SIGNALS_QUERY,
            variable_values=vars_common,
            context_value=graphql_auth_context(),
        )
    )
    assert not r1.errors
    sig = r1.data["instagramSignals"]
    assert sig is not None
    assert sig["analyticsRunId"] == str(run_id)
    assert sig["periodHeadline"]["totalRevenue"] is not None
    assert sig["bestPostingWindow"]["peakDay"] is not None

    r2 = asyncio.run(
        schema.execute(
            _CATEGORY_MIX_QUERY,
            variable_values=vars_common,
            context_value=graphql_auth_context(),
        )
    )
    assert not r2.errors
    mix = r2.data["categoryMix"]
    assert mix is not None
    assert len(mix["rows"]) >= 1
    assert mix["topRevenueCategory"] is not None

    r3 = asyncio.run(
        schema.execute(
            _REVENUE_TRENDS_QUERY,
            variable_values=vars_common,
            context_value=graphql_auth_context(),
        )
    )
    assert not r3.errors
    trends = r3.data["revenueTrends"]
    assert trends is not None
    assert trends["currentPeriodTotalRevenue"] > 0
    assert len(trends["rows"]) >= 1

    r4 = asyncio.run(
        schema.execute(
            _PROMOTION_CANDIDATES_SIGNALS_QUERY,
            variable_values=vars_common,
            context_value=graphql_auth_context(),
        )
    )
    assert not r4.errors
    candidates = r4.data["promotionCandidatesSignals"]
    assert candidates is not None
    assert candidates["analyticsRunId"] == str(run_id)
    assert isinstance(candidates["bestPostingWindowSummary"], str)
    assert candidates["itemsTotalCount"] >= 1
    assert candidates["rankedCandidatesTotalCount"] == len(candidates["rankedCandidates"])
