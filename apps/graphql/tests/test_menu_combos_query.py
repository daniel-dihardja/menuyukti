"""Tests for menuCombos GraphQL query."""

from pathlib import Path

import pytest
from graphql.data_sources import AnalyticsRun, OrderFact, SessionLocal
from graphql.schema import schema
from graphql.services.menu_combos import _star_focus_menus
from graphql.services.menu_engineering import compute_menu_engineering_matrix
from graphql.tests.auth_context import graphql_auth_context
from menuyukti.core.analytics import compute_menu_basket_affinities_from_orders

ROOT_DIR = Path(__file__).resolve().parents[3]

MENU_COMBOS_QUERY = """
query AnalyticsRunMenuCombos($id: ID!, $locationId: ID) {
  menuCombos(analyticsRunId: $id, locationId: $locationId) {
    totalOrders
    multiItemOrderCount
    avgDistinctItemsPerOrder
    scope
    focusMenus
    pairs {
      menuA
      menuB
      coOrderCount
      support
      confidenceAToB
      confidenceBToA
      lift
      menuACategory
      menuBCategory
      matrixCategoryA
      matrixCategoryB
    }
    matrixLift
    slotDemandProfile {
      day
      mealPeriod
      mealPeriodLabel
      mealPeriodHoursLabel
      orderCount
      trafficShare
      demandIndex
      relativeDemand
    }
    topPairTiming {
      menuA
      menuB
      recommendedWindow {
        bestDay
        bestMealPeriod
        bestMealPeriodLabel
        bestMealPeriodHoursLabel
        peakHour
        coOrderIndex
        sampleCoOrders
        confidenceTier
      }
      promoPosture {
        promoPosture
        peakDay
        peakMealPeriod
        pairCoOrderIndex
        venueDemandIndex
        venueRelativeDemand
        promoReason
      }
      dayMealCells {
        day
        mealPeriod
        mealPeriodLabel
        mealPeriodHoursLabel
        coOrderCount
        coOrderIndex
        attachRate
      }
      hourlyCoOrders {
        hour
        coOrderCount
      }
    }
  }
}
"""


def _order_rows_from_facts(rows: list[OrderFact]) -> list[dict]:
    return [
        {
            "bill_number": r.bill_number,
            "menu": r.menu,
            "menu_category": r.menu_category,
            "menu_category_detail": r.menu_category_detail,
        }
        for r in rows
    ]


def test_menu_combos_unauthorized_returns_null():
    result = schema.execute_sync(
        MENU_COMBOS_QUERY,
        variable_values={"id": "999999"},
        context_value=graphql_auth_context(),
    )
    assert result.errors is None
    assert result.data["menuCombos"] is None


def test_menu_combos_with_synthetic_facts(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data
    session = SessionLocal()
    try:
        run = session.get(AnalyticsRun, run_id)
        assert run is not None
        location_id = run.location_id
        facts = session.query(OrderFact).where(OrderFact.analytics_run_id == run_id).all()
        matrix_data = compute_menu_engineering_matrix(session, run, order_facts=facts)
        focus_menus = _star_focus_menus(matrix_data.items) if matrix_data else None
        expected = compute_menu_basket_affinities_from_orders(
            _order_rows_from_facts(facts),
            focus_menus=focus_menus,
        )
    finally:
        session.close()

    result = schema.execute_sync(
        MENU_COMBOS_QUERY,
        variable_values={"id": str(run_id), "locationId": str(location_id)},
        context_value=graphql_auth_context(),
    )
    assert result.errors is None, result.errors
    payload = result.data["menuCombos"]
    assert payload is not None
    assert payload["totalOrders"] == expected["total_orders"]
    assert payload["multiItemOrderCount"] == expected["multi_item_order_count"]
    assert payload["scope"] == expected["scope"]
    assert len(payload["pairs"]) == len(expected["pairs"])
    if expected["pairs"]:
        assert payload["pairs"][0]["lift"] == pytest.approx(expected["pairs"][0]["lift"])
        top_timing = payload["topPairTiming"]
        assert len(top_timing) == len(
            [p for p in payload["pairs"] if p["lift"] >= 1.5]
        )
        if top_timing:
            top_pair = max(payload["pairs"], key=lambda p: (p["lift"], p["coOrderCount"]))
            assert top_timing[0]["menuA"] == top_pair["menuA"]
            assert top_timing[0]["menuB"] == top_pair["menuB"]
            assert "recommendedWindow" in top_timing[0]
            assert "dayMealCells" in top_timing[0]
            assert len(top_timing[0]["dayMealCells"]) == 35
            assert "promoPosture" in top_timing[0]
            assert top_timing[0]["promoPosture"]["promoPosture"] in {
                "support",
                "promote",
                "maintain",
            }
            assert len(payload["slotDemandProfile"]) == 35
            lunch_cell = next(
                c for c in top_timing[0]["dayMealCells"] if c["mealPeriod"] == "lunch"
            )
            assert lunch_cell["mealPeriodHoursLabel"] == "11:00–14:59"
