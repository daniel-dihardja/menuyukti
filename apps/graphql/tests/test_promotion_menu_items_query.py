"""Integration tests for promotionMenuItems GraphQL field."""

import asyncio
from unittest.mock import patch

import pandas as pd
import pytest
from graphql.schema import schema
from graphql.services.promotion_menu_items import (
    _peak_day_from_weekly,
    _peak_hour_from_daily,
)
from graphql.tests.auth_context import graphql_auth_context
from graphql.tests.fixtures.qa_data import (
    QA_SALES_ROWS,
    qa_order_rows_for_heatmap,
    qa_order_rows_for_matrix,
)
from menuyukti.core.analytics import compute_menu_heatmaps_from_orders
from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    compute_menu_engineering_from_orders,
)
from menuyukti.core.analytics.extract_menu_items import extract_menu_items

PROMOTION_MENU_ITEMS_QUERY = """
query PromotionMenuItems($runId: ID!, $locationId: ID) {
  promotionMenuItems(analyticsRunId: $runId, locationId: $locationId) {
    analyticsRunId
    periodStart
    periodEnd
    itemsTotalCount
    itemsTruncated
    items {
      menu
      quantity
      totalRevenue
      menuCategory
      menuCategoryDetail
      cogs
      totalCogs
      contributionMargin
      contributionMarginPercentage
      marginPerUnit
      weValue
      category
      action
      peakHour
      peakDay
    }
  }
}
"""


def _expected_extracted_count() -> int:
    df = pd.DataFrame(
        [
            {
                "menu": r.menu,
                "qty": r.qty,
                "price": r.price,
                "menu_category": r.menuCategory,
                "menu_category_detail": r.menuCategoryDetail,
            }
            for r in QA_SALES_ROWS
        ]
    )
    return len(extract_menu_items(df))


def _expected_peaks_by_menu() -> dict[str, tuple[int | None, str | None]]:
    payloads = compute_menu_heatmaps_from_orders(qa_order_rows_for_heatmap())
    out: dict[str, tuple[int | None, str | None]] = {}
    for p in payloads:
        menu = p["menu"]
        out[menu] = (
            _peak_hour_from_daily(list(p["daily_heatmap"])),
            _peak_day_from_weekly(list(p["weekly_heatmap"])),
        )
    return out


def test_promotion_menu_items_with_qa_data(
    analytics_run_with_qa_data,
    qa_cogs_by_menu,
):
    run_id = analytics_run_with_qa_data
    expected_matrix = compute_menu_engineering_from_orders(
        qa_order_rows_for_matrix(),
        qa_cogs_by_menu,
    )
    matrix_by_menu = {item["menu"]: item for item in expected_matrix["items"]}
    expected_peaks = _expected_peaks_by_menu()

    result = asyncio.run(
        schema.execute(
            PROMOTION_MENU_ITEMS_QUERY,
            variable_values={"runId": str(run_id), "locationId": None},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors

    payload = result.data["promotionMenuItems"]
    assert payload is not None
    items = payload["items"]
    expected_n = _expected_extracted_count()
    assert len(items) == expected_n
    assert payload["itemsTotalCount"] == expected_n
    assert payload["itemsTruncated"] is False

    by_menu = {i["menu"]: i for i in items}
    for menu, exp in matrix_by_menu.items():
        got = by_menu[menu]
        assert got["category"] == exp["category"]
        assert got["action"] == exp["action"]
        assert int(got["quantity"]) == exp["quantity"]
        assert pytest.approx(float(got["totalRevenue"]), rel=1e-6) == exp["total_revenue"]
        assert pytest.approx(float(got["cogs"]), rel=1e-6) == exp["cogs"]
        assert (
            pytest.approx(float(got["contributionMargin"]), rel=1e-6) == exp["contribution_margin"]
        )
        assert (
            pytest.approx(float(got["contributionMarginPercentage"]), rel=1e-5)
            == exp["contribution_margin_percentage"]
        )

    for menu, (eh, ed) in expected_peaks.items():
        assert by_menu[menu]["peakHour"] == eh
        assert by_menu[menu]["peakDay"] == ed


def test_promotion_menu_items_none_without_cogs(analytics_run_with_qa_sales_only):
    run_id = analytics_run_with_qa_sales_only

    result = asyncio.run(
        schema.execute(
            PROMOTION_MENU_ITEMS_QUERY,
            variable_values={"runId": str(run_id), "locationId": None},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors

    payload = result.data["promotionMenuItems"]
    assert payload is not None
    items = payload["items"]
    expected_n = _expected_extracted_count()
    assert len(items) == expected_n
    assert payload["itemsTotalCount"] == expected_n
    assert payload["itemsTruncated"] is False

    for row in items:
        assert row["cogs"] is None
        assert row["totalCogs"] is None
        assert row["contributionMargin"] is None
        assert row["contributionMarginPercentage"] is None
        assert row["marginPerUnit"] is None
        assert row["weValue"] is None
        assert row["category"] is None
        assert row["action"] is None
        assert isinstance(row["quantity"], int)
        assert float(row["totalRevenue"]) > 0


def test_promotion_menu_items_truncates_when_cap_exceeded(analytics_run_with_qa_data):
    """With a lowered cap, fewer items are returned than menus evaluated."""
    run_id = analytics_run_with_qa_data
    expected_n = _expected_extracted_count()
    assert expected_n == 4

    with patch(
        "graphql.services.promotion_menu_items._MAX_PROMOTION_MENU_ITEMS",
        3,
    ):
        result = asyncio.run(
            schema.execute(
                PROMOTION_MENU_ITEMS_QUERY,
                variable_values={"runId": str(run_id), "locationId": None},
                context_value=graphql_auth_context(),
            )
        )
    assert not result.errors
    payload = result.data["promotionMenuItems"]
    assert payload is not None
    assert len(payload["items"]) == 3
    assert payload["itemsTotalCount"] == 4
    assert payload["itemsTruncated"] is True


def test_promotion_menu_items_wrong_location_returns_none(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data

    result = asyncio.run(
        schema.execute(
            PROMOTION_MENU_ITEMS_QUERY,
            variable_values={"runId": str(run_id), "locationId": "99999"},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    assert result.data["promotionMenuItems"] is None
