"""Tests for promotionEngineeringCandidates JSON query."""

from __future__ import annotations

import asyncio

from graphql.data_sources import AnalyticsRun, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import graphql_auth_context

_QUERY = """
query Pec($locationId: ID!, $analyticsRunId: ID!, $maxStarItems: Int, $maxPuzzleItems: Int) {
  promotionEngineeringCandidates(
    locationId: $locationId
    analyticsRunId: $analyticsRunId
    maxStarItems: $maxStarItems
    maxPuzzleItems: $maxPuzzleItems
  )
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


def _assert_engineering_item(item: object) -> None:
    assert isinstance(item, dict)
    assert "menu" in item
    assert isinstance(item["menu"], str)
    assert item["menu"].strip()
    assert "popularity" in item
    assert "quantity" in item
    popularity = float(item["popularity"])
    quantity = int(item["quantity"])
    assert 0.0 <= popularity <= 1.0
    assert quantity > 0


def test_promotion_engineering_candidates_with_qa_data(analytics_run_with_qa_data: int) -> None:
    run_id = analytics_run_with_qa_data
    location_id = _location_id(run_id)
    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={
                "locationId": str(location_id),
                "analyticsRunId": str(run_id),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    payload = result.data["promotionEngineeringCandidates"]
    assert payload is not None
    assert payload["grouping"] in ("flat", "by_menu_category")
    if payload["grouping"] == "by_menu_category":
        assert "categories" in payload
        assert "Mains" in payload["categories"]
        mains = payload["categories"]["Mains"]
        assert isinstance(mains["starItems"], list)
        assert isinstance(mains["puzzleItems"], list)
        assert len(mains["starItems"]) <= 5
        assert len(mains["puzzleItems"]) <= 10
        if mains["starItems"]:
            _assert_engineering_item(mains["starItems"][0])
        if mains["puzzleItems"]:
            _assert_engineering_item(mains["puzzleItems"][0])
    else:
        assert isinstance(payload["starItems"], list)
        assert isinstance(payload["puzzleItems"], list)
        assert len(payload["starItems"]) <= 5
        assert len(payload["puzzleItems"]) <= 10
        if payload["starItems"]:
            _assert_engineering_item(payload["starItems"][0])
        if payload["puzzleItems"]:
            _assert_engineering_item(payload["puzzleItems"][0])


def test_promotion_engineering_candidates_wrong_location_returns_none(
    analytics_run_with_qa_data: int,
) -> None:
    run_id = analytics_run_with_qa_data
    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={
                "locationId": "999999",
                "analyticsRunId": str(run_id),
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    assert result.data["promotionEngineeringCandidates"] is None


def test_promotion_engineering_candidates_respects_max_args(
    analytics_run_with_qa_data: int,
) -> None:
    run_id = analytics_run_with_qa_data
    location_id = _location_id(run_id)
    result = asyncio.run(
        schema.execute(
            _QUERY,
            variable_values={
                "locationId": str(location_id),
                "analyticsRunId": str(run_id),
                "maxStarItems": 2,
                "maxPuzzleItems": 1,
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    payload = result.data["promotionEngineeringCandidates"]
    assert payload is not None
    if payload["grouping"] == "by_menu_category":
        for bucket in payload["categories"].values():
            assert len(bucket["starItems"]) <= 2
            assert len(bucket["puzzleItems"]) <= 1
    else:
        assert len(payload["starItems"]) <= 2
        assert len(payload["puzzleItems"]) <= 1
