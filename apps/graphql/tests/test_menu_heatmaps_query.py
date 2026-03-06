from datetime import datetime
from io import BytesIO
from pathlib import Path

import asyncio
import pytest

from graphql.data_sources import AnalyticsRun, Location, OrderFact, SessionLocal
from graphql.reports import normalize_sales_report
from graphql.reports.transform import line_items_to_dataframe
from graphql.schema import schema
from menuyukti.core.analytics.calculate_menu_heatmaps import calculate_menu_heatmaps
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
query AnalyticsRunMenuHeatmaps {
  analyticsRuns {
    id
    filename
    menuHeatmaps {
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

        location = Location(name="Test Location")
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
        )
    )
    assert not upload_result.errors

    query_result = asyncio.run(schema.execute(HEATMAPS_QUERY))
    assert not query_result.errors

    runs = query_result.data["analyticsRuns"]
    target_runs = [r for r in runs if r["filename"] == REPORT_FILE.name]
    assert target_runs, "Expected at least one analyticsRun for uploaded report"
    run_data = target_runs[-1]

    menu_heatmaps = run_data["menuHeatmaps"]
    graphql_normalized = _normalize_graphql_heatmaps(menu_heatmaps)

    # Expect the same number of menu heatmaps and identical ordering.
    assert len(graphql_normalized) == len(expected_normalized)

    for got, expected in zip(graphql_normalized, expected_normalized):
        assert got["menu"] == expected["menu"]
        assert got["menu_category"] == expected["menu_category"]
        assert got["menu_category_detail"] == expected["menu_category_detail"]
        assert got["reporting_period"] == expected["reporting_period"]
        assert got["daily"] == expected["daily"]
        assert got["weekly"] == expected["weekly"]

