"""Tests for location-scoped COGS catalog and run seeding."""

from __future__ import annotations

import asyncio

import pytest
from graphql.data_sources import (
    AnalyticsRun,
    Location,
    LocationMenuItemCogs,
    MenuItemCogs,
    OrderFact,
    SessionLocal,
)
from graphql.schema import schema
from graphql.services.location_cogs import (
    LocationCogsUpsertItem,
    apply_location_cogs_to_run,
    copy_run_cogs_to_location,
    menu_key,
    seed_run_cogs_from_location,
    upsert_location_cogs_bulk,
)
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

UPSERT_LOCATION_COGS = """
mutation UpsertLocationCogs($locationId: ID!, $items: [LocationMenuItemCogsUpsertInput!]!) {
  upsertLocationMenuItemCogsBulk(locationId: $locationId, items: $items) {
    id
    locationId
    menu
    cogs
  }
}
"""

LOCATION_COGS_QUERY = """
query LocationCogs($locationId: ID!) {
  locationMenuItemCogs(locationId: $locationId) {
    menu
    cogs
  }
}
"""

APPLY_TO_RUN = """
mutation Apply($analyticsRunId: ID!) {
  applyLocationCogsToAnalyticsRun(analyticsRunId: $analyticsRunId) {
    menu
    cogs
  }
}
"""

SAVE_TO_LOCATION = """
mutation Save($analyticsRunId: ID!) {
  saveAnalyticsRunCogsToLocation(analyticsRunId: $analyticsRunId) {
    menu
    cogs
    locationId
  }
}
"""


def _clean_db(session) -> None:
    session.query(MenuItemCogs).delete()
    session.query(LocationMenuItemCogs).delete()
    session.query(OrderFact).delete()
    session.query(AnalyticsRun).delete()
    session.query(Location).delete()
    session.commit()


def _make_location_and_run(session, *, run_name: str = "Run") -> tuple[Location, AnalyticsRun]:
    location = Location(name="Loc COGS Test", clerk_user_id=GRAPHQL_TEST_USER_ID)
    session.add(location)
    session.commit()
    session.refresh(location)
    run = AnalyticsRun(
        name=run_name,
        filename=f"{run_name}.xlsx",
        pos_system="esb",
        location_id=location.id,
    )
    session.add(run)
    session.commit()
    session.refresh(run)
    return location, run


def test_menu_key_casefold():
    assert menu_key("  Nasi Goreng ") == menu_key("nasi goreng")


def test_upsert_location_cogs_and_query():
    session = SessionLocal()
    try:
        _clean_db(session)
        location, _run = _make_location_and_run(session)
        loc_id = location.id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            UPSERT_LOCATION_COGS,
            variable_values={
                "locationId": str(loc_id),
                "items": [
                    {"menuName": "Nasi Goreng", "cogs": 12.5},
                    {"menuName": "Es Teh", "cogs": 2.0},
                ],
            },
            context_value=graphql_auth_context(),
        )
    )
    assert not result.errors
    assert len(result.data["upsertLocationMenuItemCogsBulk"]) == 2

    queried = asyncio.run(
        schema.execute(
            LOCATION_COGS_QUERY,
            variable_values={"locationId": str(loc_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not queried.errors
    by_menu = {row["menu"]: row["cogs"] for row in queried.data["locationMenuItemCogs"]}
    assert by_menu["Nasi Goreng"] == pytest.approx(12.5)
    assert by_menu["Es Teh"] == pytest.approx(2.0)


def test_location_cogs_query_empty_when_unauthorized():
    session = SessionLocal()
    try:
        _clean_db(session)
        location, _run = _make_location_and_run(session)
        session.add(
            LocationMenuItemCogs(location_id=location.id, menu="Secret", cogs=1.0, currency="IDR")
        )
        session.commit()
        loc_id = location.id
    finally:
        session.close()

    result = asyncio.run(
        schema.execute(
            LOCATION_COGS_QUERY,
            variable_values={"locationId": str(loc_id)},
            context_value={},
        )
    )
    assert not result.errors
    assert result.data["locationMenuItemCogs"] == []


def test_seed_run_cogs_case_insensitive_partial_match():
    session = SessionLocal()
    try:
        _clean_db(session)
        location, run = _make_location_and_run(session)
        upsert_location_cogs_bulk(
            session,
            location.id,
            [
                LocationCogsUpsertItem(menu_name="Nasi Goreng", cogs=10.0),
                LocationCogsUpsertItem(menu_name="Es Teh", cogs=3.0),
            ],
        )
        session.commit()

        touched = seed_run_cogs_from_location(
            session,
            analytics_run_id=run.id,
            location_id=location.id,
            menus={"nasi goreng", "Mie Ayam"},
        )
        session.commit()

        assert len(touched) == 1
        assert touched[0].menu == "nasi goreng"
        assert touched[0].cogs == pytest.approx(10.0)

        rows = session.query(MenuItemCogs).where(MenuItemCogs.analytics_run_id == run.id).all()
        assert len(rows) == 1
        assert {r.menu for r in rows} == {"nasi goreng"}
    finally:
        session.close()


def test_apply_and_save_round_trip(analytics_run_with_qa_data, qa_cogs_by_menu):
    run_id = analytics_run_with_qa_data
    session = SessionLocal()
    try:
        run = session.get(AnalyticsRun, run_id)
        assert run is not None
        location_id = run.location_id

        session.query(LocationMenuItemCogs).where(
            LocationMenuItemCogs.location_id == location_id
        ).delete()
        session.commit()

        saved = copy_run_cogs_to_location(session, analytics_run_id=run_id, location_id=location_id)
        session.commit()
        assert len(saved) == len(qa_cogs_by_menu)

        session.query(MenuItemCogs).where(MenuItemCogs.analytics_run_id == run_id).delete()
        session.commit()
        assert (
            session.query(MenuItemCogs).where(MenuItemCogs.analytics_run_id == run_id).count() == 0
        )

        applied = apply_location_cogs_to_run(
            session, analytics_run_id=run_id, location_id=location_id
        )
        session.commit()
        assert len(applied) >= 1
        by_menu = {row.menu: float(row.cogs) for row in applied}
        for menu, expected in qa_cogs_by_menu.items():
            assert menu in by_menu
            assert by_menu[menu] == pytest.approx(expected)
    finally:
        session.close()


def test_graphql_save_and_apply_mutations(analytics_run_with_qa_data):
    run_id = analytics_run_with_qa_data

    save_result = asyncio.run(
        schema.execute(
            SAVE_TO_LOCATION,
            variable_values={"analyticsRunId": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not save_result.errors
    assert len(save_result.data["saveAnalyticsRunCogsToLocation"]) >= 1

    session = SessionLocal()
    try:
        session.query(MenuItemCogs).where(MenuItemCogs.analytics_run_id == run_id).delete()
        session.commit()
    finally:
        session.close()

    apply_result = asyncio.run(
        schema.execute(
            APPLY_TO_RUN,
            variable_values={"analyticsRunId": str(run_id)},
            context_value=graphql_auth_context(),
        )
    )
    assert not apply_result.errors
    assert len(apply_result.data["applyLocationCogsToAnalyticsRun"]) >= 1
