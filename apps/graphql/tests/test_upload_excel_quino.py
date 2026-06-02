import asyncio
from io import BytesIO
from pathlib import Path

import pytest
from graphql.data_sources import AnalyticsRun, Location, OrderFact, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from starlette.datastructures import Headers, UploadFile

ROOT_DIR = Path(__file__).resolve().parents[3]
REPORT_FILE = ROOT_DIR / "reports" / "quino" / "ItemSalesReport_2026_April_02.xlsx"

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
            "Expected QUINO report at 'reports/quino/ItemSalesReport_2026_April_02.xlsx'."
        )

    payload = REPORT_FILE.read_bytes()
    upload = UploadFile(
        file=BytesIO(payload),
        filename=REPORT_FILE.name,
        headers=Headers(
            {"content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
        ),
    )

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
    assert len(data["normalizedRows"]) > 0
    assert all((row["qty"] or 0) > 0 for row in data["normalizedRows"])
    assert all((row["totalAfterBillDiscount"] or 0) > 0 for row in data["normalizedRows"])

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
        assert len(facts) == len(data["normalizedRows"])
        assert all(row.pos_system == "quino" for row in facts)
    finally:
        session.close()
