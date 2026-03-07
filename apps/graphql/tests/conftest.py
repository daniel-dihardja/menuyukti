"""Pytest configuration and fixtures for GraphQL integration tests.

Sets DATABASE_URL before any import of graphql.data_sources so the test DB
is used. Provides session-scoped DB lifecycle (init/teardown).
"""

import os
from pathlib import Path

# Must set before any import of graphql.data_sources (engine is created at import time)
TEST_DB = Path(__file__).resolve().parent.parent / "test.db"
os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{TEST_DB}"

import pytest


@pytest.fixture(scope="session", autouse=True)
def _graphql_test_db():
    """Initialize and tear down the test database for the session."""
    from graphql.data_sources import drop_db, init_db

    drop_db()
    init_db()
    yield
    drop_db()


@pytest.fixture
def qa_sales_rows():
    """Minimal QA sales rows (NormalizedLineItemData) for heatmap and matrix tests."""
    from graphql.tests.fixtures.qa_data import QA_SALES_ROWS

    return list(QA_SALES_ROWS)


@pytest.fixture
def qa_cogs_by_menu():
    """Per-menu COGS for QA data (same 4 menus as qa_sales_rows)."""
    from graphql.tests.fixtures.qa_data import QA_COGS_BY_MENU

    return dict(QA_COGS_BY_MENU)


@pytest.fixture
def analytics_run_with_qa_data(qa_sales_rows, qa_cogs_by_menu):
    """Create Location, AnalyticsRun, OrderFact rows, and MenuItemCogs from QA data. Yields run_id."""
    from datetime import datetime

    from graphql.data_sources import (
        AnalyticsRun,
        Location,
        MenuItemCogs,
        OrderFact,
        SessionLocal,
    )
    from graphql.reports import persist_sales_report

    session = SessionLocal()
    try:
        session.query(MenuItemCogs).delete()
        session.query(OrderFact).delete()
        session.query(AnalyticsRun).delete()
        session.query(Location).delete()
        session.commit()

        location = Location(name="QA Test Location")
        session.add(location)
        session.commit()
        session.refresh(location)

        times = [
            r.orderTime if isinstance(r.orderTime, datetime) else datetime.fromisoformat(str(r.orderTime))
            for r in qa_sales_rows
        ]
        period_start = min(times).date() if times else None
        period_end = max(times).date() if times else None

        run = AnalyticsRun(
            name="QA Run",
            filename="qa_data",
            pos_system="esb",
            period_start=period_start,
            period_end=period_end,
            location_id=location.id,
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id
    finally:
        session.close()

    persist_sales_report(qa_sales_rows, "esb", analytics_run_id=run_id)

    session = SessionLocal()
    try:
        order_facts = (
            session.query(OrderFact).where(OrderFact.analytics_run_id == run_id).all()
        )
        seen_menus: dict[str, tuple[str, str]] = {}
        for row in order_facts:
            if row.menu not in seen_menus:
                seen_menus[row.menu] = (row.menu_category, row.menu_category_detail)
        for menu, (menu_category, menu_category_detail) in seen_menus.items():
            cogs = qa_cogs_by_menu.get(menu, 0.0)
            session.add(
                MenuItemCogs(
                    analytics_run_id=run_id,
                    menu=menu,
                    menu_category=menu_category,
                    menu_category_detail=menu_category_detail,
                    cogs=cogs,
                    currency="IDR",
                )
            )
        session.commit()
    finally:
        session.close()

    yield run_id


@pytest.fixture
def analytics_run_with_qa_sales_only(qa_sales_rows):
    """Same as analytics_run_with_qa_data but no MenuItemCogs (for matrix None test)."""
    from datetime import datetime

    from graphql.data_sources import (
        AnalyticsRun,
        Location,
        MenuItemCogs,
        OrderFact,
        SessionLocal,
    )
    from graphql.reports import persist_sales_report

    session = SessionLocal()
    try:
        session.query(MenuItemCogs).delete()
        session.query(OrderFact).delete()
        session.query(AnalyticsRun).delete()
        session.query(Location).delete()
        session.commit()

        location = Location(name="QA Test Location (no COGS)")
        session.add(location)
        session.commit()
        session.refresh(location)

        times = [
            r.orderTime if isinstance(r.orderTime, datetime) else datetime.fromisoformat(str(r.orderTime))
            for r in qa_sales_rows
        ]
        period_start = min(times).date() if times else None
        period_end = max(times).date() if times else None

        run = AnalyticsRun(
            name="QA Run (no COGS)",
            filename="qa_data",
            pos_system="esb",
            period_start=period_start,
            period_end=period_end,
            location_id=location.id,
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id
    finally:
        session.close()

    persist_sales_report(qa_sales_rows, "esb", analytics_run_id=run_id)
    yield run_id
