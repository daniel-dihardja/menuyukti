import asyncio
from datetime import datetime
from io import BytesIO
from pathlib import Path

import pandas as pd
import pytest
from graphql.data_sources import AnalyticsRun, Location, OrderFact, SessionLocal
from graphql.reports import normalize_sales_report
from graphql.reports.transform import line_items_to_dataframe
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from menuyukti.core.analytics.calculate_menu_heatmaps import (
    calculate_menu_heatmaps,
    compute_menu_heatmaps_from_orders,
)
from starlette.datastructures import Headers, UploadFile

ROOT_DIR = Path(__file__).resolve().parents[3]
REPORT_FILE = ROOT_DIR / "reports" / "Sales_Recapitulation_Detail_Report_Test.xlsx"


UPLOAD_MUTATION = """
mutation UploadFile($file: Upload!, $locationId: ID!) {
  uploadSalesReport(file: $file, locationId: $locationId) {
    filename
  }
}
"""

HEATMAPS_QUERY = """
query AnalyticsRunMenuHeatmaps($id: ID!, $locationId: ID) {
  menuHeatmaps(analyticsRunId: $id, locationId: $locationId) {
    menu
    menuCategory
    menuCategoryDetail
    reportingPeriod
    dailyHeatmap {
      hour
      quantity
    }
    weeklyHeatmap {
      day
      quantity
    }
  }
}
"""


def _normalize_graphql_heatmaps(menu_heatmaps):
    """Convert GraphQL heatmaps into a comparable normalized structure."""
    normalized = []
    for m in menu_heatmaps:
        daily = [(int(row["hour"]), int(row["quantity"])) for row in m["dailyHeatmap"]]
        weekly = [(row["day"], int(row["quantity"])) for row in m["weeklyHeatmap"]]
        normalized.append(
            {
                "menu": m["menu"],
                "menu_category": m["menuCategory"],
                "menu_category_detail": m["menuCategoryDetail"],
                "reporting_period": m["reportingPeriod"],
                "daily": daily,
                "weekly": weekly,
            }
        )
    return normalized


def test_compute_menu_heatmaps_from_orders_matches_calculate_menu_heatmaps():
    """compute_menu_heatmaps_from_orders yields same result as calculate_menu_heatmaps(df)."""
    base = datetime(2024, 6, 15, 12, 0, 0)
    order_rows = [
        {
            "menu": "Burger",
            "qty": 2,
            "order_time": base,
            "menu_category": "Mains",
            "menu_category_detail": "Grill",
        },
        {
            "menu": "Burger",
            "qty": 1,
            "order_time": base.replace(hour=14),
            "menu_category": "Mains",
            "menu_category_detail": "Grill",
        },
        {
            "menu": "Fries",
            "qty": 3,
            "order_time": base.replace(hour=12),
            "menu_category": "Sides",
            "menu_category_detail": None,
        },
    ]
    from_orders = compute_menu_heatmaps_from_orders(order_rows)
    df = pd.DataFrame(order_rows)
    from_df = calculate_menu_heatmaps(df)
    expected = _normalize_expected_heatmaps(from_df)
    got = _normalize_expected_heatmaps(from_orders)
    assert len(got) == len(expected)
    for g, e in zip(got, expected, strict=False):
        assert g["menu"] == e["menu"]
        assert g["menu_category"] == e["menu_category"]
        assert g["menu_category_detail"] == e["menu_category_detail"]
        assert g["daily"] == e["daily"]
        assert g["weekly"] == e["weekly"]


def test_compute_menu_heatmaps_from_orders_empty():
    """compute_menu_heatmaps_from_orders returns [] for empty input."""
    assert compute_menu_heatmaps_from_orders([]) == []


def test_menu_heatmaps_with_qa_data(analytics_run_with_qa_data):
    """Menu heatmaps from GraphQL match menuyukti for QA data (no Excel)."""
    from graphql.tests.fixtures.qa_data import qa_order_rows_for_heatmap

    run_id = analytics_run_with_qa_data
    order_rows = qa_order_rows_for_heatmap()
    expected_payloads = compute_menu_heatmaps_from_orders(order_rows)
    expected_normalized = _normalize_expected_heatmaps(expected_payloads)

    query_result = asyncio.run(
        schema.execute(
            HEATMAPS_QUERY,
            variable_values={"id": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not query_result.errors

    menu_heatmaps = query_result.data["menuHeatmaps"]
    assert menu_heatmaps is not None
    graphql_normalized = _normalize_graphql_heatmaps(menu_heatmaps)

    assert len(graphql_normalized) == len(expected_normalized)
    for got, expected in zip(graphql_normalized, expected_normalized, strict=False):
        assert got["menu"] == expected["menu"]
        assert got["menu_category"] == expected["menu_category"]
        assert got["menu_category_detail"] == expected["menu_category_detail"]
        assert got["reporting_period"] == expected["reporting_period"]
        assert got["daily"] == expected["daily"]
        assert got["weekly"] == expected["weekly"]


def _normalize_expected_heatmaps(expected_payloads):
    normalized = []
    for payload in expected_payloads:
        daily = [
            (int(row["hour"]), int(row["quantity"]))
            for row in payload["daily_heatmap"]
        ]
        weekly = [
            (row["day"], int(row["quantity"]))
            for row in payload["weekly_heatmap"]
        ]
        normalized.append(
            {
                "menu": payload["menu"],
                "menu_category": payload["menu_category"],
                "menu_category_detail": payload["menu_category_detail"],
                "reporting_period": payload["reporting_period"],
                "daily": daily,
                "weekly": weekly,
            }
        )
    return normalized


def _get_location_id_for_run(run_id: int) -> int:
    session = SessionLocal()
    try:
        run = session.get(AnalyticsRun, run_id)
        assert run is not None
        return run.location_id
    finally:
        session.close()


def test_menu_heatmaps_wrong_location_returns_empty(analytics_run_with_qa_data):
    """When locationId does not match the run's location, returns []."""
    run_id = analytics_run_with_qa_data
    result = asyncio.run(
        schema.execute(
            HEATMAPS_QUERY,
            variable_values={"id": str(run_id), "locationId": "99999"},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    assert result.data["menuHeatmaps"] == []


def test_menu_heatmaps_with_matching_location_id(analytics_run_with_qa_data):
    """Explicit locationId matching the run returns the same heatmaps as when omitted."""
    run_id = analytics_run_with_qa_data
    location_id = _get_location_id_for_run(run_id)
    from graphql.tests.fixtures.qa_data import qa_order_rows_for_heatmap

    order_rows = qa_order_rows_for_heatmap()
    expected_payloads = compute_menu_heatmaps_from_orders(order_rows)
    expected_normalized = _normalize_expected_heatmaps(expected_payloads)

    query_result = asyncio.run(
        schema.execute(
            HEATMAPS_QUERY,
            variable_values={"id": str(run_id), "locationId": str(location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not query_result.errors
    graphql_normalized = _normalize_graphql_heatmaps(query_result.data["menuHeatmaps"])
    assert len(graphql_normalized) == len(expected_normalized)
    for got, expected in zip(graphql_normalized, expected_normalized, strict=False):
        assert got["reporting_period"] == expected["reporting_period"]
        assert got["daily"] == expected["daily"]
        assert got["weekly"] == expected["weekly"]


def test_menu_heatmaps_match_menuyukti_calculation(tmp_path):
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected sample Excel file at 'reports/Sales_Recapitulation_Detail_Report_Test.xlsx' to exist."
        )

    payload = REPORT_FILE.read_bytes()
    upload = UploadFile(
        file=BytesIO(payload),
        filename=REPORT_FILE.name,
        headers=Headers(
            {
                "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        ),
    )

    # Build expected heatmaps directly from menuyukti using normalized rows.
    rows, _ = normalize_sales_report(payload)
    df = line_items_to_dataframe(rows)
    expected_payloads = calculate_menu_heatmaps(df)
    expected_normalized = _normalize_expected_heatmaps(expected_payloads)

    session = SessionLocal()
    try:
        session.query(OrderFact).delete()
        session.query(AnalyticsRun).delete()
        session.query(Location).delete()
        session.commit()

        location = Location(name="Test Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    upload_result = asyncio.run(
        schema.execute(
            UPLOAD_MUTATION,
            variable_values={"file": upload, "locationId": str(location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not upload_result.errors

    session = SessionLocal()
    try:
        run = session.query(AnalyticsRun).order_by(AnalyticsRun.id.desc()).first()
        assert run is not None, "Expected an analytics run after upload"
        run_id = run.id
    finally:
        session.close()

    query_result = asyncio.run(
        schema.execute(
            HEATMAPS_QUERY,
            variable_values={"id": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not query_result.errors

    menu_heatmaps = query_result.data["menuHeatmaps"]
    assert menu_heatmaps is not None, "Expected menuHeatmaps for uploaded report"
    graphql_normalized = _normalize_graphql_heatmaps(menu_heatmaps)

    # Expect the same number of menu heatmaps and identical ordering.
    assert len(graphql_normalized) == len(expected_normalized)

    for got, expected in zip(graphql_normalized, expected_normalized, strict=False):
        assert got["menu"] == expected["menu"]
        assert got["menu_category"] == expected["menu_category"]
        assert got["menu_category_detail"] == expected["menu_category_detail"]
        assert got["reporting_period"] == expected["reporting_period"]
        assert got["daily"] == expected["daily"]
        assert got["weekly"] == expected["weekly"]

