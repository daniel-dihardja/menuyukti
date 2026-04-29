"""Integration tests for menuItemsCatalog GraphQL field."""

from __future__ import annotations

import asyncio

from graphql.data_sources import AnalyticsRun, SessionLocal
from graphql.schema import schema
from graphql.tests.auth_context import graphql_auth_context

MENU_CATALOG_QUERY = """
query MenuItemsCatalog($locationId: Int!) {
  menuItemsCatalog(locationId: $locationId) {
    analyticsRunId
    items {
      id
      name
      category
      price
      quantity
      isActive
    }
  }
}
"""

MENU_CATALOG_FOR_RUN_QUERY = """
query MenuItemsCatalogForRun($analyticsRunId: ID!) {
  menuItemsCatalogForRun(analyticsRunId: $analyticsRunId) {
    analyticsRunId
    items {
      id
      name
      category
      price
      quantity
      isActive
    }
  }
}
"""


def test_menu_items_catalog_with_qa_data(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data
    session = SessionLocal()
    try:
        run = session.get(AnalyticsRun, run_id)
        assert run is not None
        loc_id = run.location_id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            MENU_CATALOG_QUERY,
            variable_values={"locationId": loc_id},
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    payload = result.data["menuItemsCatalog"]
    assert payload is not None
    assert len(payload["items"]) >= 1
    assert payload["analyticsRunId"] == str(run_id)
    assert all(item["quantity"] >= 0 for item in payload["items"])


def test_menu_items_catalog_for_run_with_qa_data(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data

    result = asyncio.run(
        schema.execute(
            MENU_CATALOG_FOR_RUN_QUERY,
            variable_values={"analyticsRunId": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )

    assert not result.errors
    payload = result.data["menuItemsCatalogForRun"]
    assert payload is not None
    assert payload["analyticsRunId"] == str(run_id)
    assert len(payload["items"]) >= 1
    assert all(item["quantity"] >= 0 for item in payload["items"])
