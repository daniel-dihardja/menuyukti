"""Tests for inventar refill forecast query."""

from __future__ import annotations

import asyncio
from datetime import UTC, date, datetime, timedelta

import pytest
from graphql.data_sources import (
    InventoryCatalogItem,
    InventoryStock,
    InventoryStockMovement,
    Location,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.schema import schema
from graphql.tests.auth_context import GRAPHQL_TEST_USER_ID, graphql_auth_context

OTHER_USER_ID = "clerk_other_user"

_CREATE_WITH_STOCK = """
mutation CreateWithStock(
  $locationId: Int!
  $name: String!
  $packageSize: Float!
  $packageUnit: String!
  $onHand: Float!
  $minOnHand: Float
) {
  createInventoryCatalogItemWithStock(
    locationId: $locationId
    name: $name
    packageSize: $packageSize
    packageUnit: $packageUnit
    onHand: $onHand
    minOnHand: $minOnHand
  ) {
    id
    onHand
    catalogItem { id name minOnHand }
  }
}
"""

_CONSUME_STOCK = """
mutation ConsumeStock($stockId: Int!, $quantity: Float!, $occurredOn: Date) {
  consumeInventoryStock(stockId: $stockId, quantity: $quantity, occurredOn: $occurredOn) {
    id
    onHand
  }
}
"""

_TRANSFER_STOCK = """
mutation TransferStock(
  $fromStockId: Int!
  $toLocationId: Int!
  $quantity: Float!
  $occurredOn: Date
) {
  transferInventoryStock(
    fromStockId: $fromStockId
    toLocationId: $toLocationId
    quantity: $quantity
    occurredOn: $occurredOn
  ) {
    fromStock { id onHand }
    toStock { id onHand }
  }
}
"""

_FORECAST_QUERY = """
query Forecast($locationId: ID!, $windowDays: Int) {
  inventoryRefillForecast(locationId: $locationId, windowDays: $windowDays) {
    catalogItemId
    name
    storageZone
    onHand
    minOnHand
    avgDailyOut
    daysUntilRefill
    priorityRank
    confidence
    windowDays
  }
}
"""


@pytest.fixture
def inventar_workspace_and_location():
    session = SessionLocal()
    try:
        session.query(InventoryStockMovement).delete()
        session.query(InventoryStock).delete()
        session.query(InventoryCatalogItem).delete()
        session.query(Location).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(name="Forecast WS", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=GRAPHQL_TEST_USER_ID,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        location = Location(
            name="Main cafe",
            workspace_id=ws.id,
            clerk_user_id=GRAPHQL_TEST_USER_ID,
        )
        session.add(location)
        session.commit()
        session.refresh(ws)
        session.refresh(location)
        payload = {"workspace_id": ws.id, "location_id": location.id}
    finally:
        session.close()
    yield payload
    session = SessionLocal()
    try:
        session.query(InventoryStockMovement).delete()
        session.query(InventoryStock).delete()
        session.query(InventoryCatalogItem).delete()
        session.query(Location).filter(Location.workspace_id == payload["workspace_id"]).delete()
        session.query(WorkspaceMembership).filter(
            WorkspaceMembership.workspace_id == payload["workspace_id"]
        ).delete()
        session.query(Workspace).filter(Workspace.id == payload["workspace_id"]).delete()
        session.commit()
    finally:
        session.close()


@pytest.fixture
def inventar_two_locations(inventar_workspace_and_location):
    session = SessionLocal()
    try:
        second = Location(
            name="Second cafe",
            workspace_id=inventar_workspace_and_location["workspace_id"],
            clerk_user_id=GRAPHQL_TEST_USER_ID,
        )
        session.add(second)
        session.commit()
        session.refresh(second)
        second_id = second.id
    finally:
        session.close()
    yield {
        **inventar_workspace_and_location,
        "location_id_b": second_id,
    }


def _execute(query: str, variable_values: dict | None = None, context_value: dict | None = None):
    return asyncio.run(
        schema.execute(
            query,
            variable_values=variable_values or {},
            context_value=context_value if context_value is not None else graphql_auth_context(),
        )
    )


def _iso(d: date) -> str:
    return d.isoformat()


def test_forecast_below_min_is_zero_days(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    today = datetime.now(tz=UTC).date()

    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Oat milk",
            "packageSize": 1.0,
            "packageUnit": "L",
            "onHand": 1.0,
            "minOnHand": 2.0,
        },
    )
    assert not created.errors, created.errors
    stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]

    consumed = _execute(
        _CONSUME_STOCK,
        {"stockId": stock_id, "quantity": 0.5, "occurredOn": _iso(today - timedelta(days=1))},
    )
    assert not consumed.errors, consumed.errors

    result = _execute(_FORECAST_QUERY, {"locationId": str(loc_id), "windowDays": 14})
    assert not result.errors, result.errors
    rows = result.data["inventoryRefillForecast"]
    assert len(rows) == 1
    assert rows[0]["daysUntilRefill"] == 0.0
    assert rows[0]["confidence"] == "ok"
    assert rows[0]["priorityRank"] == 1
    assert rows[0]["avgDailyOut"] > 0


def test_forecast_healthy_burn_computes_days(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    today = datetime.now(tz=UTC).date()

    # onHand=5, min=1 → surplus 4; 14 outs of 0.5 = 7 total → avg 0.5/day → 8 days
    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Beans",
            "packageSize": 1.0,
            "packageUnit": "kg",
            "onHand": 12.0,
            "minOnHand": 1.0,
        },
    )
    assert not created.errors, created.errors
    stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]

    for offset in range(14):
        consumed = _execute(
            _CONSUME_STOCK,
            {
                "stockId": stock_id,
                "quantity": 0.5,
                "occurredOn": _iso(today - timedelta(days=offset)),
            },
        )
        assert not consumed.errors, consumed.errors

    result = _execute(_FORECAST_QUERY, {"locationId": str(loc_id), "windowDays": 14})
    assert not result.errors, result.errors
    row = result.data["inventoryRefillForecast"][0]
    assert row["onHand"] == 5.0
    assert row["avgDailyOut"] == pytest.approx(0.5)
    assert row["daysUntilRefill"] == pytest.approx(8.0)
    assert row["confidence"] == "ok"
    assert row["windowDays"] == 14


def test_forecast_no_outs_insufficient_history(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]

    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Dish soap",
            "packageSize": 1.0,
            "packageUnit": "L",
            "onHand": 2.0,
            "minOnHand": None,
        },
    )
    assert not created.errors, created.errors

    result = _execute(_FORECAST_QUERY, {"locationId": str(loc_id)})
    assert not result.errors, result.errors
    row = result.data["inventoryRefillForecast"][0]
    assert row["daysUntilRefill"] is None
    assert row["confidence"] == "insufficient_history"
    assert row["avgDailyOut"] == 0.0


def test_forecast_unauthorized_returns_empty(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Sugar",
            "packageSize": 1.0,
            "packageUnit": "kg",
            "onHand": 2.0,
        },
    )
    result = _execute(
        _FORECAST_QUERY,
        {"locationId": str(loc_id)},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert not result.errors, result.errors
    assert result.data["inventoryRefillForecast"] == []


def test_forecast_transfer_out_counts_toward_burn(inventar_two_locations):
    loc_a = inventar_two_locations["location_id"]
    loc_b = inventar_two_locations["location_id_b"]
    today = datetime.now(tz=UTC).date()

    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_a,
            "name": "Berries",
            "packageSize": 500.0,
            "packageUnit": "g",
            "onHand": 5.0,
            "minOnHand": 1.0,
        },
    )
    assert not created.errors, created.errors
    stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]

    transferred = _execute(
        _TRANSFER_STOCK,
        {
            "fromStockId": stock_id,
            "toLocationId": loc_b,
            "quantity": 2.0,
            "occurredOn": _iso(today),
        },
    )
    assert not transferred.errors, transferred.errors

    result = _execute(_FORECAST_QUERY, {"locationId": str(loc_a), "windowDays": 14})
    assert not result.errors, result.errors
    row = result.data["inventoryRefillForecast"][0]
    assert row["onHand"] == 3.0
    assert row["avgDailyOut"] == pytest.approx(2.0 / 14.0)
    # surplus to min = 3 - 1 = 2 → 2 / (2/14) = 14 days
    assert row["daysUntilRefill"] == pytest.approx(14.0)
    assert row["confidence"] == "ok"


def test_forecast_ranks_urgent_before_medium(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    today = datetime.now(tz=UTC).date()

    urgent = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Oat milk",
            "packageSize": 1.0,
            "packageUnit": "L",
            "onHand": 11.0,
            "minOnHand": 2.0,
        },
    )
    medium = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Espresso beans",
            "packageSize": 1.0,
            "packageUnit": "kg",
            "onHand": 11.0,
            "minOnHand": 1.0,
        },
    )
    soap = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Dish soap",
            "packageSize": 1.0,
            "packageUnit": "L",
            "onHand": 2.0,
        },
    )
    assert not urgent.errors and not medium.errors and not soap.errors
    oat_id = urgent.data["createInventoryCatalogItemWithStock"]["id"]
    bean_id = medium.data["createInventoryCatalogItemWithStock"]["id"]

    for offset in range(14):
        _execute(
            _CONSUME_STOCK,
            {"stockId": oat_id, "quantity": 0.5, "occurredOn": _iso(today - timedelta(days=offset))},
        )
    for offset in (0, 5, 10):
        _execute(
            _CONSUME_STOCK,
            {"stockId": bean_id, "quantity": 1.0, "occurredOn": _iso(today - timedelta(days=offset))},
        )

    result = _execute(_FORECAST_QUERY, {"locationId": str(loc_id), "windowDays": 14})
    assert not result.errors, result.errors
    rows = result.data["inventoryRefillForecast"]
    names = [r["name"] for r in rows]
    assert names[0] == "Oat milk"
    assert names[1] == "Espresso beans"
    assert names[2] == "Dish soap"
    assert rows[0]["onHand"] == 4.0
    assert rows[1]["onHand"] == 8.0
    assert rows[2]["confidence"] == "insufficient_history"
