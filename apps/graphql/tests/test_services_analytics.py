"""Unit tests for GraphQL analytics service orchestration (no Strawberry layer)."""

from __future__ import annotations

from graphql.data_sources import AnalyticsRun, SessionLocal
from graphql.services.analytics_bundle import AnalyticsBundleOptions, build_analytics_bundle
from graphql.services.category_mix import build_category_mix
from graphql.services.menu_heatmaps import build_menu_heatmaps
from graphql.services.operating_profile import build_operating_profile
from graphql.services.order_fact_rows import (
    facts_to_basket_rows,
    facts_to_heatmap_rows,
    facts_to_menu_engineering_rows,
    facts_to_operating_profile_rows,
)
from graphql.services.order_facts import load_order_facts
from graphql.services.order_metrics import build_order_metrics


def _load_run(run_id: int) -> tuple:
    session = SessionLocal()
    run = session.get(AnalyticsRun, run_id)
    assert run is not None
    return session, run


def test_build_operating_profile_returns_metrics(analytics_run_with_qa_data: int) -> None:
    session, run = _load_run(analytics_run_with_qa_data)
    try:
        result = build_operating_profile(session, run)
        assert result is not None
        assert result["total_orders"] > 0
        assert result["total_revenue"] > 0
        assert isinstance(result["day_of_week_breakdown"], list)
    finally:
        session.close()


def test_build_category_mix_returns_rows(analytics_run_with_qa_data: int) -> None:
    session, run = _load_run(analytics_run_with_qa_data)
    try:
        result = build_category_mix(session, run)
        assert result is not None
        assert result["analytics_run_id"] == run.id
        assert len(result["rows"]) > 0
    finally:
        session.close()


def test_build_order_metrics_returns_averages(analytics_run_with_qa_data: int) -> None:
    session, run = _load_run(analytics_run_with_qa_data)
    try:
        result = build_order_metrics(session, run)
        assert result["avg_order_size"] > 0
        assert result["avg_order_revenue"] > 0
        assert len(result["by_day_of_week"]) == 7
    finally:
        session.close()


def test_build_menu_heatmaps_returns_payloads(analytics_run_with_qa_data: int) -> None:
    session, run = _load_run(analytics_run_with_qa_data)
    try:
        payloads = build_menu_heatmaps(session, run)
        assert len(payloads) > 0
        assert "daily_heatmap" in payloads[0]
        assert "weekly_heatmap" in payloads[0]
    finally:
        session.close()


def test_build_analytics_bundle_composes_sections(analytics_run_with_qa_data: int) -> None:
    session, run = _load_run(analytics_run_with_qa_data)
    try:
        bundle = build_analytics_bundle(session, run, AnalyticsBundleOptions())
        assert bundle.analytics_run_id == run.id
        assert bundle.order_metrics is not None
        assert bundle.menu_engineering_matrix is not None
        assert bundle.menu_heatmaps is not None
        assert bundle.category_mix is not None
    finally:
        session.close()


def test_order_fact_row_mappers_match_fact_shape(analytics_run_with_qa_data: int) -> None:
    session, run = _load_run(analytics_run_with_qa_data)
    try:
        facts = load_order_facts(session, run.id)
        assert facts
        profile_rows = facts_to_operating_profile_rows(facts)
        heatmap_rows = facts_to_heatmap_rows(facts)
        basket_rows = facts_to_basket_rows(facts)
        matrix_rows = facts_to_menu_engineering_rows(facts)
        assert len(profile_rows) == len(facts)
        assert len(heatmap_rows) == len(facts)
        assert len(basket_rows) == len(facts)
        assert len(matrix_rows) == len(facts)
        assert "order_time" in profile_rows[0]
        assert "menu" in heatmap_rows[0]
        assert "bill_number" in basket_rows[0]
        assert "total_after_bill_discount" in matrix_rows[0]
    finally:
        session.close()


def test_build_operating_profile_empty_when_no_facts(analytics_run_with_qa_sales_only: int) -> None:
    session, run = _load_run(analytics_run_with_qa_sales_only)
    try:
        facts = load_order_facts(session, run.id)
        assert facts
        result = build_operating_profile(session, run, order_facts=[])
        assert result is None
    finally:
        session.close()
