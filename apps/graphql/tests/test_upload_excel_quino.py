import asyncio
from dataclasses import asdict
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
REPORT_FILE = ROOT_DIR / "reports" / "quino" / "TransactionItemDetailReport_May_2026.xlsx"

MUTATION = """
mutation UploadFile($file: Upload!, $locationId: ID!) {
  uploadSalesReport(file: $file, locationId: $locationId, includeLineItems: true) {
    filename
    normalizedRows {
      billNumber
      menu
      qty
      price
      totalAfterBillDiscount
      orderTime
      menuCategory
      menuCategoryDetail
    }
  }
}
"""


def test_upload_quino_excel_persists_quino_order_facts():
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected QUINO report at 'reports/quino/TransactionItemDetailReport_May_2026.xlsx'."
        )

    payload = REPORT_FILE.read_bytes()
    upload = UploadFile(
        file=BytesIO(payload),
        filename=REPORT_FILE.name,
        headers=Headers(
            {"content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        ),
    )

    expected_rows, detected_pos = normalize_sales_report(payload)
    expected_records = [asdict(row) for row in expected_rows]
    assert detected_pos == "quino"

    session = SessionLocal()
    try:
        session.query(OrderFact).delete()
        session.query(AnalyticsRun).delete()
        session.query(Location).delete()
        session.commit()

        location = Location(name="QUINO Test Location", clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(location)
        session.commit()
        session.refresh(location)
        location_id = location.id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            MUTATION,
            variable_values={"file": upload, "locationId": str(location_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors

    data = result.data["uploadSalesReport"]
    assert data["filename"] == REPORT_FILE.name
    normalized_rows = data["normalizedRows"]
    assert len(normalized_rows) == len(expected_records)
    assert all((row["qty"] or 0) > 0 for row in normalized_rows)
    assert all((row["totalAfterBillDiscount"] or 0) > 0 for row in normalized_rows)
    assert all(str(row["billNumber"]).startswith("INV-") for row in normalized_rows)

    if expected_records:
        expected_first = expected_records[0]
        order_time = expected_first["orderTime"]
        if hasattr(order_time, "to_pydatetime"):
            order_time = order_time.to_pydatetime()

        order_time_value = normalized_rows[0]["orderTime"]
        if isinstance(order_time_value, str):
            order_time_value = datetime.fromisoformat(order_time_value)

        assert normalized_rows[0]["billNumber"] == expected_first["billNumber"]
        assert normalized_rows[0]["menu"] == expected_first["menu"]
        assert normalized_rows[0]["qty"] == int(expected_first["qty"])
        assert normalized_rows[0]["price"] == float(expected_first["price"])
        assert normalized_rows[0]["totalAfterBillDiscount"] == float(
            expected_first["totalAfterBillDiscount"]
        )
        assert order_time_value == order_time
        assert normalized_rows[0]["menuCategory"] == expected_first["menuCategory"]
        assert normalized_rows[0]["menuCategoryDetail"] == expected_first["menuCategoryDetail"]

    session = SessionLocal()
    try:
        run = (
            session.query(AnalyticsRun)
            .filter(AnalyticsRun.filename == REPORT_FILE.name)
            .order_by(AnalyticsRun.id.desc())
            .first()
        )
        assert run is not None
        assert run.pos_system == "quino"

        facts = session.query(OrderFact).filter(OrderFact.analytics_run_id == run.id).all()
        assert len(facts) == len(normalized_rows)
        assert all(row.pos_system == "quino" for row in facts)
        assert all(row.bill_number.startswith("INV-") for row in facts)
    finally:
        session.close()
