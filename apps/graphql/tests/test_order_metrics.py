import asyncio
from collections import defaultdict
from datetime import datetime
from io import BytesIO
from pathlib import Path

import pytest
from graphql.data_sources import AnalyticsRun, Location, OrderFact, SessionLocal
from graphql.reports import normalize_sales_report
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
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
query AnalyticsRunOrderMetrics($id: ID!) {
  analyticsRun(id: $id) {
    id
    filename
    periodStart
    periodEnd
  }
  orderMetrics(analyticsRunId: $id) {
    avgOrderSize
    avgOrderRevenue
  }
}
"""


def _order_metrics_from_groups(
    orders: dict,
) -> tuple[float, float, datetime | None, datetime | None]:
    if not orders:
        return 0.0, 0.0, None, None

    sizes: list[int] = []
    revenues: list[float] = []
    all_times: list[datetime] = []

    for group in orders.values():
        revenue = float(sum(r.totalAfterBillDiscount for r in group))
        if revenue <= 0:
            continue
        sizes.append(int(sum(r.qty for r in group)))
        revenues.append(revenue)
        for r in group:
            order_time = r.orderTime
            if hasattr(order_time, "to_pydatetime"):
                order_time = order_time.to_pydatetime()
            elif isinstance(order_time, str):
                order_time = datetime.fromisoformat(order_time)
            all_times.append(order_time)

    if not sizes:
        return 0.0, 0.0, None, None

    avg_order_size = float(sum(sizes)) / len(sizes)
    avg_order_revenue = float(sum(revenues)) / len(revenues)
    period_start = min(all_times).date() if all_times else None
    period_end = max(all_times).date() if all_times else None

    return avg_order_size, avg_order_revenue, period_start, period_end


def _compute_expected_metrics(payload: bytes):
    rows, _ = normalize_sales_report(payload)

    orders = defaultdict(list)
    for row in rows:
        orders[row.billNumber].append(row)

    return _order_metrics_from_groups(orders)


def _parse_date_value(value):
    if value is None:
        return None
    if isinstance(value, str):
        return datetime.fromisoformat(value).date()
    return value


def _expected_metrics_from_rows(rows):
    """Compute expected avgOrderSize, avgOrderRevenue, periodStart, periodEnd from rows."""
    orders = defaultdict(list)
    for r in rows:
        orders[r.billNumber].append(r)
    return _order_metrics_from_groups(orders)


def test_order_metrics_with_qa_data(analytics_run_with_qa_data, qa_sales_rows):
    """Order metrics from GraphQL match expected values from QA sales rows (no Excel)."""
    run_id = analytics_run_with_qa_data
    expected_avg_size, expected_avg_revenue, expected_start, expected_end = (
        _expected_metrics_from_rows(qa_sales_rows)
    )

    result = asyncio.run(
        schema.execute(
            METRICS_QUERY,
            variable_values={"id": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors

    run_data = result.data["analyticsRun"]
    assert run_data is not None
    metrics = result.data["orderMetrics"]
    assert metrics is not None

    assert pytest.approx(float(metrics["avgOrderSize"]), rel=1e-6) == expected_avg_size
    assert pytest.approx(float(metrics["avgOrderRevenue"]), rel=1e-6) == expected_avg_revenue
    if expected_start is not None:
        assert _parse_date_value(run_data["periodStart"]) == expected_start
    if expected_end is not None:
        assert _parse_date_value(run_data["periodEnd"]) == expected_end


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
            {"content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
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

    metrics_result = asyncio.run(
        schema.execute(
            METRICS_QUERY,
            variable_values={"id": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not metrics_result.errors

    run_data = metrics_result.data["analyticsRun"]
    assert run_data is not None, "Expected analyticsRun for uploaded report"
    assert run_data["filename"] == REPORT_FILE.name

    metrics = metrics_result.data["orderMetrics"]
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
