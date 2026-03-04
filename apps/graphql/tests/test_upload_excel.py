from io import BytesIO
from pathlib import Path

import pytest
import asyncio
from apps.graphql.schema import schema
from starlette.datastructures import Headers, UploadFile

ROOT_DIR = Path(__file__).resolve().parents[3]
REPORT_FILE = ROOT_DIR / "reports" / "Sales_Recapitulation_Detail_Report_Test.xlsx"
UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads"

MUTATION = """
mutation UploadFile($file: Upload!) {
  uploadExcel(file: $file) {
    filename
    storedPath
    sheetNames
    headerPreview
    sizeBytes
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

    stored_path.unlink()
