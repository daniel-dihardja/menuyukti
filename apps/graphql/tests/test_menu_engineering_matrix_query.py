import asyncio
import json
from io import BytesIO
from pathlib import Path

import pytest
from graphql.data_sources import (
    AnalyticsRun,
    Location,
    MenuItemCogs,
    OrderFact,
    SessionLocal,
)
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context
from starlette.datastructures import Headers, UploadFile

ROOT_DIR = Path(__file__).resolve().parents[3]
REPORT_FILE = ROOT_DIR / "reports" / "Sales_Recapitulation_Detail_Report_Test.xlsx"
MENU_COGS_FILE = ROOT_DIR / "notebooks" / "data" / "menu_cogs.json"


UPLOAD_MUTATION = """
mutation UploadFile($file: Upload!, $locationId: ID!) {
  uploadSalesReport(file: $file, locationId: $locationId) {
    filename
  }
}
"""

MENU_ENGINEERING_MATRIX_QUERY = """
query MenuEngineeringMatrix($runId: ID!) {
  menuEngineeringMatrix(analyticsRunId: $runId) {
    thresholds {
      avgPopularity
      avgContributionMargin
      totalCogs
      totalProfit
      totalMargin
    }
    distribution {
      category
      itemCount
      itemShare
      marginShare
    }
    items {
      menu
      quantity
      totalRevenue
      cogs
      totalCogs
      contributionMargin
      contributionMarginPercentage
      marginPerUnit
      weValue
      category
      action
      menuCategory
      menuCategoryDetail
    }
  }
}
"""


def _load_cogs_by_menu():
    """Load menu_cogs.json and return a dict menu -> cogs (first occurrence per menu)."""
    if not MENU_COGS_FILE.exists():
        return None
    raw = json.loads(MENU_COGS_FILE.read_text())
    by_menu = {}
    for entry in raw:
        menu = entry.get("menu")
        if menu is not None and menu not in by_menu:
            by_menu[menu] = float(entry.get("cogs", 0))
    return by_menu


def test_menu_engineering_matrix_with_qa_data(analytics_run_with_qa_data, qa_cogs_by_menu):
    """Menu engineering matrix from GraphQL matches menuyukti for QA data (no Excel/JSON)."""
    from graphql.tests.fixtures.qa_data import qa_order_rows_for_matrix
    from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
        compute_menu_engineering_from_orders,
    )

    run_id = analytics_run_with_qa_data
    order_rows = qa_order_rows_for_matrix()
    expected = compute_menu_engineering_from_orders(order_rows, qa_cogs_by_menu)

    query_result = asyncio.run(
        schema.execute(
            MENU_ENGINEERING_MATRIX_QUERY,
            variable_values={"runId": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not query_result.errors

    matrix = query_result.data["menuEngineeringMatrix"]
    assert matrix is not None

    th = matrix["thresholds"]
    assert pytest.approx(float(th["avgPopularity"]), rel=1e-6) == expected["thresholds"]["avg_popularity"]
    assert pytest.approx(float(th["avgContributionMargin"]), rel=1e-6) == expected["thresholds"]["avg_contribution_margin"]

    items = matrix["items"]
    assert len(items) == len(expected["items"])
    by_menu = {item["menu"]: item for item in items}
    for exp_item in expected["items"]:
        got_item = by_menu[exp_item["menu"]]
        assert got_item["category"] == exp_item["category"]
        assert got_item["action"] == exp_item["action"]
        assert pytest.approx(float(got_item["contributionMarginPercentage"]), rel=1e-5) == exp_item["contribution_margin_percentage"]


def test_menu_engineering_matrix_none_without_cogs(analytics_run_with_qa_sales_only):
    """Menu engineering matrix is None when the run has no COGS."""
    run_id = analytics_run_with_qa_sales_only

    query_result = asyncio.run(
        schema.execute(
            MENU_ENGINEERING_MATRIX_QUERY,
            variable_values={"runId": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not query_result.errors

    matrix = query_result.data["menuEngineeringMatrix"]
    assert matrix is None


def test_menu_engineering_matrix_query_returns_matrix_with_cogs_from_json():
    if not REPORT_FILE.exists():
        pytest.skip(
            "Expected sample Excel file at 'reports/Sales_Recapitulation_Detail_Report_Test.xlsx' to exist."
        )
    if not MENU_COGS_FILE.exists():
        pytest.skip(
            "Expected COGS data at 'notebooks/data/menu_cogs.json' to exist."
        )

    cogs_by_menu = _load_cogs_by_menu()
    assert cogs_by_menu is not None

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
        session.query(MenuItemCogs).delete()
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
        assert run is not None

        order_facts = (
            session.query(OrderFact)
            .where(OrderFact.analytics_run_id == run.id)
            .all()
        )
        seen_menus = {}
        for row in order_facts:
            if row.menu not in seen_menus:
                seen_menus[row.menu] = (row.menu_category, row.menu_category_detail)

        for menu, (menu_category, menu_category_detail) in seen_menus.items():
            cogs = cogs_by_menu.get(menu, 0.0)
            session.add(
                MenuItemCogs(
                    analytics_run_id=run.id,
                    menu=menu,
                    menu_category=menu_category,
                    menu_category_detail=menu_category_detail,
                    cogs=cogs,
                    currency="IDR",
                )
            )
        session.commit()
        run_id = run.id
    finally:
        session.close()

    query_result = asyncio.run(
        schema.execute(
            MENU_ENGINEERING_MATRIX_QUERY,
            variable_values={"runId": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not query_result.errors, query_result.errors

    matrix = query_result.data["menuEngineeringMatrix"]
    assert matrix is not None, "menuEngineeringMatrix should be computed when COGS are set"

    thresholds = matrix["thresholds"]
    assert thresholds is not None
    assert "avgPopularity" in thresholds
    assert "avgContributionMargin" in thresholds
    assert "totalCogs" in thresholds
    assert "totalProfit" in thresholds
    assert "totalMargin" in thresholds

    distribution = matrix["distribution"]
    assert isinstance(distribution, list)
    assert len(distribution) >= 1
    categories = {d["category"] for d in distribution}
    expected_categories = {"star", "plow_horse", "puzzle", "low_end"}
    assert categories.issubset(expected_categories), f"Unexpected categories: {categories}"

    items = matrix["items"]
    assert isinstance(items, list)
    assert len(items) >= 1

    for item in items:
        assert "menu" in item
        assert "category" in item
        assert "action" in item
        assert "quantity" in item
        assert "totalRevenue" in item
        assert "cogs" in item
        assert "contributionMargin" in item
        assert item["category"] in expected_categories
        assert item["action"] in ("keep", "promote", "reprice", "remove")

    items_with_cogs = [i for i in items if float(i["cogs"]) > 0]
    assert len(items_with_cogs) >= 1, "At least one item should have non-zero COGS and appear in the matrix"
