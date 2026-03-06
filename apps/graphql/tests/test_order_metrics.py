from collections import defaultdict
from datetime import datetime
from io import BytesIO
from pathlib import Path

import asyncio
import pytest

from graphql.data_sources import AnalyticsRun, Location, OrderFact, SessionLocal
from graphql.reports import normalize_sales_report
from graphql.schema import schema
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

METRICS_QUERY = """
query AnalyticsRunOrderMetrics {
  analyticsRuns {
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


def _compute_expected_metrics(payload: bytes):
    rows, _ = normalize_sales_report(payload)

    orders = defaultdict(list)
    for row in rows:
        orders[row.billNumber].append(row)

    if not orders:
        return 0.0, 0.0, None, None

    sizes = []
    revenues = []
    all_times: list[datetime] = []

    for group in orders.values():
        sizes.append(len(group))
        revenues.append(
            float(sum(r.totalAfterBillDiscount for r in group))
        )
        for r in group:
            order_time = r.orderTime
            if hasattr(order_time, "to_pydatetime"):
                order_time = order_time.to_pydatetime()
            elif isinstance(order_time, str):
                order_time = datetime.fromisoformat(order_time)
            all_times.append(order_time)

    avg_order_size = float(sum(sizes)) / len(sizes)
    avg_order_revenue = float(sum(revenues)) / len(revenues)

    period_start = min(all_times).date() if all_times else None
    period_end = max(all_times).date() if all_times else None

    return avg_order_size, avg_order_revenue, period_start, period_end


def _parse_date_value(value):
    if value is None:
        return None
    if isinstance(value, str):
        return datetime.fromisoformat(value).date()
    return value


def test_order_metrics_for_uploaded_run(tmp_path):
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

    expected_avg_size, expected_avg_revenue, expected_start, expected_end = (
        _compute_expected_metrics(payload)
    )

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

    metrics_result = asyncio.run(schema.execute(METRICS_QUERY))
    assert not metrics_result.errors

    runs = metrics_result.data["analyticsRuns"]
    target_runs = [r for r in runs if r["filename"] == REPORT_FILE.name]
    assert target_runs, "Expected at least one analyticsRun for uploaded report"
    run_data = target_runs[-1]

    metrics = run_data["orderMetrics"]
    assert metrics is not None

    avg_order_size = float(metrics["avgOrderSize"])
    avg_order_revenue = float(metrics["avgOrderRevenue"])
    period_start = _parse_date_value(run_data["periodStart"])
    period_end = _parse_date_value(run_data["periodEnd"])

    assert pytest.approx(avg_order_size, rel=1e-6) == expected_avg_size
    assert pytest.approx(avg_order_revenue, rel=1e-6) == expected_avg_revenue

    if expected_start is not None:
        assert period_start == expected_start
    if expected_end is not None:
        assert period_end == expected_end

