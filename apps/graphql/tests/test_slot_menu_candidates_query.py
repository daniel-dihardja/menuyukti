"""Tests for slotMenuCandidates GraphQL query."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import AnalyticsRun, Location, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from graphql.tests.fixtures.qa_data import (
    QA_SALES_ROWS,
    qa_order_rows_for_heatmap,
    qa_order_rows_for_matrix,
)
from menuyukti.core.analytics import compute_slot_menu_candidates

_QUERY = """
query SlotMenuCandidates(
  $analyticsRunId: ID!
  $locationId: ID
  $options: SlotMenuCandidatesOptionsInput
) {
  slotMenuCandidates(
    analyticsRunId: $analyticsRunId
    locationId: $locationId
    options: $options
  ) {
    reportingPeriod
    matrixAvailable
    coverageNotes
    slots {
      day
      mealPeriod
      orderCount
      posture
      insufficientData
      candidates {
        menu
        globalCategory
        rank
        score
        slotQuantity
        slotShare
        slotAffinity
        recommendedUse
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


def _qa_combo_timing_rows() -> list[dict]:
    return [
        {
            "bill_number": r.billNumber,
            "menu": r.menu,
            "order_time": r.orderTime,
        }
        for r in QA_SALES_ROWS
    ]


def test_slot_menu_candidates_with_qa_data(
    analytics_run_with_qa_data: int, qa_cogs_by_menu: dict[str, float]
) -> None:
    run_id = analytics_run_with_qa_data
    expected = compute_slot_menu_candidates(
        qa_order_rows_for_heatmap(),
        _qa_combo_timing_rows(),
        qa_cogs_by_menu,
        matrix_rows=qa_order_rows_for_matrix(),
    )

    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={"analyticsRunId": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    payload = result.data["slotMenuCandidates"]
    assert payload is not None
    assert payload["matrixAvailable"] is True
    assert len(payload["slots"]) == len(expected["slots"])

    gql_by_key = {(s["day"], s["mealPeriod"]): s for s in payload["slots"]}
    for exp_cell in expected["slots"]:
        key = (exp_cell["day"], exp_cell["meal_period"])
        got_cell = gql_by_key[key]
        assert got_cell["orderCount"] == exp_cell["order_count"]
        assert got_cell["posture"] == exp_cell["posture"]
        assert got_cell["insufficientData"] == exp_cell["insufficient_data"]
        assert len(got_cell["candidates"]) == len(exp_cell["candidates"])
        for exp_item, got_item in zip(
            exp_cell["candidates"], got_cell["candidates"], strict=True
        ):
            assert got_item["menu"] == exp_item["menu"]
            assert got_item["rank"] == exp_item["rank"]
            assert (
                pytest.approx(float(got_item["score"]), rel=1e-6) == exp_item["score"]
            )
            assert got_item["globalCategory"] == exp_item["global_category"]


def test_slot_menu_candidates_null_without_order_facts() -> None:
    session = SessionLocal()
    try:
        location = Location(name="Empty Slot Candidates", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)

        run = AnalyticsRun(
            name="Empty Run",
            filename="empty",
            pos_system="esb",
            location_id=location.id,
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id
        location_id = location.id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={
                "analyticsRunId": str(run_id),
                "locationId": str(location_id),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    assert result.data["slotMenuCandidates"] is None


def test_slot_menu_candidates_wrong_location_returns_none(
    analytics_run_with_qa_data: int,
) -> None:
    run_id = analytics_run_with_qa_data
    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={
                "analyticsRunId": str(run_id),
                "locationId": "999999",
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    assert result.data["slotMenuCandidates"] is None


def test_slot_menu_candidates_respects_max_candidates_per_slot(
    analytics_run_with_qa_data: int,
) -> None:
    run_id = analytics_run_with_qa_data
    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={
                "analyticsRunId": str(run_id),
                "options": {"maxCandidatesPerSlot": 1},
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    payload = result.data["slotMenuCandidates"]
    assert payload is not None
    for cell in payload["slots"]:
        if cell["candidates"]:
            assert len(cell["candidates"]) <= 1


def test_slot_menu_candidates_matrix_unavailable_still_returns_slots(
    analytics_run_with_qa_sales_only: int,
) -> None:
    run_id = analytics_run_with_qa_sales_only
    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={"analyticsRunId": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    payload = result.data["slotMenuCandidates"]
    assert payload is not None
    assert payload["matrixAvailable"] is False
    assert len(payload["slots"]) == 35
