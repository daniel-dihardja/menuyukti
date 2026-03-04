from datetime import datetime
import os
from io import BytesIO
from pathlib import Path

import pytest
import asyncio

TEST_DB = Path(__file__).resolve().parents[1] / "test.db"
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{TEST_DB}"

from apps.graphql.data_sources import OrderFact, SessionLocal, init_db
from apps.graphql.schema import schema
from apps.graphql.schema.mutation import _normalize_uploaded_excel
from starlette.datastructures import Headers, UploadFile

ROOT_DIR = Path(__file__).resolve().parents[3]
REPORT_FILE = ROOT_DIR / "reports" / "Sales_Recapitulation_Detail_Report_Test.xlsx"
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"

init_db()

MUTATION = """
mutation UploadFile($file: Upload!) {
  uploadExcel(file: $file) {
    filename
    storedPath
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

    expected_df, detected_pos = _normalize_uploaded_excel(payload)
    expected_records = expected_df.to_dict(orient="records")

    result = asyncio.run(
        schema.execute(
            MUTATION,
            variable_values={"file": upload},
        )
    )
    assert not result.errors

    data = result.data["uploadExcel"]
    assert data["filename"] == REPORT_FILE.name
    stored_path = Path(data["storedPath"])
    assert stored_path.exists()
    assert stored_path.resolve().parent == UPLOAD_DIR.resolve()
    assert data["sheetNames"]
    assert isinstance(data["headerPreview"], list)
    assert data["sizeBytes"] == len(payload)
    normalized_rows = data["normalizedRows"]
    assert len(normalized_rows) == len(expected_records)

    if expected_records:
        expected_first = expected_records[0]
        order_time = expected_first["order_time"]
        if hasattr(order_time, "to_pydatetime"):
            order_time = order_time.to_pydatetime()

        order_time_value = normalized_rows[0]["orderTime"]
        if isinstance(order_time_value, str):
            order_time_value = datetime.fromisoformat(order_time_value)

        assert normalized_rows[0]["billNumber"] == expected_first["bill_number"]
        assert normalized_rows[0]["menu"] == expected_first["menu"]
        assert normalized_rows[0]["qty"] == int(expected_first["qty"])
        assert normalized_rows[0]["price"] == float(expected_first["price"])
        assert normalized_rows[0]["totalAfterBillDiscount"] == float(
            expected_first["total_after_bill_discount"]
        )
        assert order_time_value == order_time
        assert normalized_rows[0]["menuCategory"] == expected_first["menu_category"]
        assert normalized_rows[0]["menuCategoryDetail"] == expected_first[
            "menu_category_detail"
        ]

    session = SessionLocal()
    try:
        assert session.query(OrderFact).count() == len(expected_records)
        session.query(OrderFact).delete()
        session.commit()
    finally:
        session.close()

    stored_path.unlink()
