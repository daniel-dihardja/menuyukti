from io import BytesIO
from pathlib import Path
import asyncio

import pytest

from graphql.data_sources import (
    AnalyticsRun,
    Location,
    MenuItemCogs,
    OrderFact,
    SessionLocal,
)
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


COGS_QUERY = """
query AnalyticsRunWithCogs($id: ID!) {
  analyticsRun(id: $id) {
    id
    filename
    menuItemCogs {
      id
      analyticsRunId
      menu
      menuCategory
      menuCategoryDetail
      cogs
      currency
      createdAt
      updatedAt
    }
  }
}
"""


def test_menu_item_cogs_query_returns_cogs_for_run(tmp_path):
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

    session = SessionLocal()
    try:
        # Start from a clean state for this test
        session.query(MenuItemCogs).delete()
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

    session = SessionLocal()
    try:
        run = session.query(AnalyticsRun).order_by(AnalyticsRun.id.desc()).first()
        assert run is not None

        cogs_rows = [
            MenuItemCogs(
                analytics_run_id=run.id,
                menu="Item A",
                menu_category="Category",
                menu_category_detail="Detail A",
                cogs=1.23,
                currency="IDR",
            ),
            MenuItemCogs(
                analytics_run_id=run.id,
                menu="Item B",
                menu_category="Category",
                menu_category_detail="Detail B",
                cogs=4.56,
                currency="IDR",
            ),
        ]
        for row in cogs_rows:
            session.add(row)
        session.commit()
    finally:
        session.close()

    run_id = run.id
    query_result = asyncio.run(
        schema.execute(COGS_QUERY, variable_values={"id": str(run_id)})
    )
    assert not query_result.errors

    run_data = query_result.data["analyticsRun"]
    assert run_data is not None, "Expected analyticsRun for uploaded report"
    assert run_data["filename"] == REPORT_FILE.name

    cogs_data = run_data["menuItemCogs"]
    assert len(cogs_data) >= 2

    by_menu = {row["menu"]: row for row in cogs_data}
    assert "Item A" in by_menu
    assert "Item B" in by_menu

    assert pytest.approx(float(by_menu["Item A"]["cogs"]), rel=1e-6) == 1.23
    assert pytest.approx(float(by_menu["Item B"]["cogs"]), rel=1e-6) == 4.56

