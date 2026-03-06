from dataclasses import asdict
from datetime import datetime
from io import BytesIO
from pathlib import Path

import asyncio
import pytest

from graphql.data_sources import Location, OrderFact, SessionLocal
from graphql.reports import normalize_sales_report
from graphql.schema import schema
from starlette.datastructures import Headers, UploadFile

ROOT_DIR = Path(__file__).resolve().parents[3]
REPORT_FILE = ROOT_DIR / "reports" / "Sales_Recapitulation_Detail_Report_Test.xlsx"

MUTATION = """
mutation UploadFile($file: Upload!, $locationId: ID!) {
  uploadSalesReport(file: $file, locationId: $locationId) {
    filename
    sheetNames
    headerPreview
    sizeBytes
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


def test_upload_excel_creates_metadata(tmp_path):
    if not REPORT_FILE.exists():
        pytest.skip("Expected sample Excel file at 'reports/Sales_Recapitulation_Detail_Report_Test.xlsx' to exist.")

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

    expected_rows, detected_pos = normalize_sales_report(payload)
    expected_records = [asdict(row) for row in expected_rows]

    session = SessionLocal()
    try:
        session.query(OrderFact).delete()
        session.commit()

        # Ensure a test location exists
        location = Location(name="Test Location")
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
        )
    )
    assert not result.errors

    data = result.data["uploadSalesReport"]
    assert data["filename"] == REPORT_FILE.name
    assert data["sheetNames"]
    assert isinstance(data["headerPreview"], list)
    assert data["sizeBytes"] == len(payload)
    normalized_rows = data["normalizedRows"]
    assert len(normalized_rows) == len(expected_records)

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
        assert normalized_rows[0]["menuCategoryDetail"] == expected_first[
            "menuCategoryDetail"
        ]

    session = SessionLocal()
    try:
        assert session.query(OrderFact).count() == len(expected_records)
        session.query(OrderFact).delete()
        session.commit()
    finally:
        session.close()
