"""QA integration tests: heatmap and menu-engineering matrix with minimal in-memory data.

Uses fixtures qa_sales_rows, qa_cogs_by_menu, analytics_run_with_qa_data so no
external Excel/JSON files are required. Run with: pytest tests/test_qa_analytics.py
"""

import asyncio
from collections import defaultdict
from datetime import date, datetime

import pytest

from graphql.schema import schema
from graphql.tests.fixtures.qa_data import (
    qa_order_rows_for_heatmap,
    qa_order_rows_for_matrix,
)
from menuyukti.core.analytics import compute_menu_heatmaps_from_orders
from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    compute_menu_engineering_from_orders,
)


METRICS_QUERY = """
query AnalyticsRunOrderMetrics($id: ID!) {
  analyticsRun(id: $id) {
    id
    filename
    periodStart
    periodEnd
    orderMetrics {
      avgOrderSize
      avgOrderRevenue
    }
  }
}
"""

HEATMAPS_QUERY = """
query AnalyticsRunMenuHeatmaps($id: ID!) {
  analyticsRun(id: $id) {
    id
    filename
    menuHeatmaps {
      menu
      menuCategory
      menuCategoryDetail
      dailyHeatmap { hour quantity }
      weeklyHeatmap { day quantity }
    }
  }
}
"""

MENU_ENGINEERING_MATRIX_QUERY = """
query MenuEngineeringMatrix($runId: ID!) {
  analyticsRun(id: $runId) {
    id
    menuEngineeringMatrix {
      thresholds {
        avgPopularity
        avgContributionMargin
        totalCogs
        totalProfit
        totalMargin
      }
      distribution { category itemCount itemShare marginShare }
      items {
        menu quantity totalRevenue cogs totalCogs contributionMargin
        contributionMarginPercentage marginPerUnit weValue category action
        menuCategory menuCategoryDetail
      }
    }
  }
}
"""

COGS_QUERY = """
query AnalyticsRunWithCogs($id: ID!) {
  analyticsRun(id: $id) {
    id
    menuItemCogs { menu cogs }
  }
}
"""


def _expected_order_metrics_from_rows(rows):
    """Compute expected avgOrderSize, avgOrderRevenue, periodStart, periodEnd from QA rows."""
    orders = defaultdict(list)
    for r in rows:
        orders[r.billNumber].append(r)
    if not orders:
        return 0.0, 0.0, None, None
    sizes = []
    revenues = []
    all_times = []
    for group in orders.values():
        sizes.append(len(group))
        revenues.append(float(sum(r.totalAfterBillDiscount for r in group)))
        for r in group:
            t = r.orderTime
            if hasattr(t, "to_pydatetime"):
                t = t.to_pydatetime()
            elif isinstance(t, str):
                t = datetime.fromisoformat(t)
            all_times.append(t)
    avg_size = sum(sizes) / len(sizes)
    avg_revenue = sum(revenues) / len(revenues)
    period_start = min(all_times).date() if all_times else None
    period_end = max(all_times).date() if all_times else None
    return avg_size, avg_revenue, period_start, period_end


def _normalize_heatmaps(menu_heatmaps):
    out = []
    for m in menu_heatmaps:
        daily = [(int(r["hour"]), int(r["quantity"])) for r in m["dailyHeatmap"]]
        weekly = [(r["day"], int(r["quantity"])) for r in m["weeklyHeatmap"]]
        out.append({
            "menu": m["menu"],
            "menu_category": m["menuCategory"],
            "menu_category_detail": m["menuCategoryDetail"],
            "daily": daily,
            "weekly": weekly,
        })
    return out


def _normalize_expected_heatmap_payloads(payloads):
    out = []
    for p in payloads:
        daily = [(int(r["hour"]), int(r["quantity"])) for r in p["daily_heatmap"]]
        weekly = [(r["day"], int(r["quantity"])) for r in p["weekly_heatmap"]]
        out.append({
            "menu": p["menu"],
            "menu_category": p["menu_category"],
            "menu_category_detail": p["menu_category_detail"],
            "daily": daily,
            "weekly": weekly,
        })
    return out


def test_qa_order_metrics(analytics_run_with_qa_data, qa_sales_rows):
    """Order metrics from GraphQL match expected values computed from QA sales rows."""
    run_id = analytics_run_with_qa_data
    expected_avg_size, expected_avg_revenue, expected_start, expected_end = _expected_order_metrics_from_rows(
        qa_sales_rows
    )

    result = asyncio.run(
        schema.execute(METRICS_QUERY, variable_values={"id": str(run_id)})
    )
    assert not result.errors

    run_data = result.data["analyticsRun"]
    assert run_data is not None
    metrics = run_data["orderMetrics"]
    assert metrics is not None

    assert pytest.approx(float(metrics["avgOrderSize"]), rel=1e-6) == expected_avg_size
    assert pytest.approx(float(metrics["avgOrderRevenue"]), rel=1e-6) == expected_avg_revenue
    if expected_start is not None:
        ps = run_data["periodStart"]
        if isinstance(ps, str):
            ps = date.fromisoformat(ps[:10])
        assert ps == expected_start
    if expected_end is not None:
        pe = run_data["periodEnd"]
        if isinstance(pe, str):
            pe = date.fromisoformat(pe[:10])
        assert pe == expected_end


def test_qa_menu_heatmaps(analytics_run_with_qa_data, qa_sales_rows):
    """Menu heatmaps from GraphQL match menuyukti output for QA data."""
    run_id = analytics_run_with_qa_data
    order_rows = qa_order_rows_for_heatmap()
    expected_payloads = compute_menu_heatmaps_from_orders(order_rows)
    expected = _normalize_expected_heatmap_payloads(expected_payloads)

    result = asyncio.run(
        schema.execute(HEATMAPS_QUERY, variable_values={"id": str(run_id)})
    )
    assert not result.errors

    run_data = result.data["analyticsRun"]
    assert run_data is not None
    menu_heatmaps = run_data["menuHeatmaps"]
    got = _normalize_heatmaps(menu_heatmaps)

    assert len(got) == len(expected)
    for g, e in zip(got, expected):
        assert g["menu"] == e["menu"]
        assert g["menu_category"] == e["menu_category"]
        assert g["menu_category_detail"] == e["menu_category_detail"]
        assert g["daily"] == e["daily"]
        assert g["weekly"] == e["weekly"]


def test_qa_menu_engineering_matrix(analytics_run_with_qa_data, qa_cogs_by_menu):
    """Menu engineering matrix from GraphQL matches menuyukti for QA data."""
    run_id = analytics_run_with_qa_data
    order_rows = qa_order_rows_for_matrix()
    expected = compute_menu_engineering_from_orders(order_rows, qa_cogs_by_menu)

    result = asyncio.run(
        schema.execute(
            MENU_ENGINEERING_MATRIX_QUERY,
            variable_values={"runId": str(run_id)},
        )
    )
    assert not result.errors

    run_data = result.data["analyticsRun"]
    assert run_data is not None
    matrix = run_data["menuEngineeringMatrix"]
    assert matrix is not None

    th = matrix["thresholds"]
    assert pytest.approx(float(th["avgPopularity"]), rel=1e-6) == expected["thresholds"]["avg_popularity"]
    assert pytest.approx(float(th["avgContributionMargin"]), rel=1e-6) == expected["thresholds"]["avg_contribution_margin"]
    assert pytest.approx(float(th["totalCogs"]), rel=1e-6) == expected["thresholds"]["total_cogs"]
    assert pytest.approx(float(th["totalProfit"]), rel=1e-6) == expected["thresholds"]["total_profit"]
    assert pytest.approx(float(th["totalMargin"]), rel=1e-5) == expected["thresholds"]["total_margin"]

    dist = matrix["distribution"]
    assert len(dist) == len(expected["distribution"])
    by_cat = {d["category"]: d for d in dist}
    for exp_d in expected["distribution"]:
        got_d = by_cat[exp_d["category"]]
        assert got_d["itemCount"] == exp_d["item_count"]
        assert pytest.approx(float(got_d["itemShare"]), rel=1e-6) == exp_d["item_share"]
        assert pytest.approx(float(got_d["marginShare"]), rel=1e-6) == exp_d["margin_share"]

    items = matrix["items"]
    assert len(items) == len(expected["items"])
    by_menu = {item["menu"]: item for item in items}
    for exp_item in expected["items"]:
        got_item = by_menu[exp_item["menu"]]
        assert got_item["category"] == exp_item["category"]
        assert got_item["action"] == exp_item["action"]
        assert int(got_item["quantity"]) == exp_item["quantity"]
        assert pytest.approx(float(got_item["totalRevenue"]), rel=1e-6) == exp_item["total_revenue"]
        assert pytest.approx(float(got_item["cogs"]), rel=1e-6) == exp_item["cogs"]
        assert pytest.approx(float(got_item["contributionMargin"]), rel=1e-6) == exp_item["contribution_margin"]
        assert pytest.approx(float(got_item["contributionMarginPercentage"]), rel=1e-5) == exp_item["contribution_margin_percentage"]


def test_qa_menu_engineering_matrix_none_without_cogs(analytics_run_with_qa_sales_only):
    """Menu engineering matrix is None when the run has no COGS."""
    run_id = analytics_run_with_qa_sales_only

    result = asyncio.run(
        schema.execute(
            MENU_ENGINEERING_MATRIX_QUERY,
            variable_values={"runId": str(run_id)},
        )
    )
    assert not result.errors

    run_data = result.data["analyticsRun"]
    assert run_data is not None
    assert run_data["menuEngineeringMatrix"] is None


def test_qa_menu_item_cogs(analytics_run_with_qa_data, qa_cogs_by_menu):
    """Menu item COGS from GraphQL match QA COGS fixture."""
    run_id = analytics_run_with_qa_data

    result = asyncio.run(
        schema.execute(COGS_QUERY, variable_values={"id": str(run_id)})
    )
    assert not result.errors

    run_data = result.data["analyticsRun"]
    assert run_data is not None
    cogs_data = run_data["menuItemCogs"]
    assert len(cogs_data) == len(qa_cogs_by_menu)

    by_menu = {row["menu"]: row for row in cogs_data}
    for menu, expected_cogs in qa_cogs_by_menu.items():
        assert menu in by_menu
        assert pytest.approx(float(by_menu[menu]["cogs"]), rel=1e-6) == expected_cogs
