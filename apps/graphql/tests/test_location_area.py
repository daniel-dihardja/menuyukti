"""Tests for location areas and inventar consume attribution."""

from __future__ import annotations

import asyncio

from graphql.data_sources import (
    InventoryStock,
    SessionLocal,
)
from graphql.schema import schema
from graphql.tests.auth_context import graphql_auth_context

OTHER_USER_ID = "clerk_other_user"

_CREATE_AREA = """
mutation CreateArea($locationId: Int!, $name: String!, $sortOrder: Int) {
  createLocationArea(locationId: $locationId, name: $name, sortOrder: $sortOrder) {
    id
    locationId
    name
    sortOrder
  }
}
"""

_UPDATE_AREA = """
mutation UpdateArea($id: Int!, $name: String, $sortOrder: Int) {
  updateLocationArea(id: $id, name: $name, sortOrder: $sortOrder) {
    id
    name
    sortOrder
  }
}
"""

_DELETE_AREA = """
mutation DeleteArea($id: Int!) {
  deleteLocationArea(id: $id)
}
"""

_LOCATION_AREAS = """
query LocationAreas($id: ID!) {
  location(id: $id) {
    id
    areas {
      id
      name
      sortOrder
    }
  }
}
"""

_CREATE_CATALOG = """
mutation CreateCatalog($workspaceId: Int!, $name: String!, $packageSize: Float!, $packageUnit: String!) {
  createInventoryCatalogItem(
    workspaceId: $workspaceId
    name: $name
    packageSize: $packageSize
    packageUnit: $packageUnit
  ) {
    id
  }
}
"""

_RECEIVE_STOCK = """
mutation ReceiveStock($locationId: Int!, $catalogItemId: Int!, $quantity: Float!) {
  receiveInventoryStock(locationId: $locationId, catalogItemId: $catalogItemId, quantity: $quantity) {
    id
    onHand
    catalogItemId
  }
}
"""

_CONSUME_STOCK = """
mutation ConsumeStock($stockId: Int!, $quantity: Float!, $areaId: Int) {
  consumeInventoryStock(stockId: $stockId, quantity: $quantity, areaId: $areaId) {
    id
    onHand
  }
}
"""

_MOVEMENTS_QUERY = """
query Movements($locationId: ID!, $catalogItemId: ID!) {
  inventoryStockMovements(locationId: $locationId, catalogItemId: $catalogItemId) {
    id
    direction
    quantity
    areaId
    areaName
  }
}
"""


def _execute(query: str, variable_values: dict | None = None, context_value: dict | None = None):
    return asyncio.run(
        schema.execute(
            query,
            variable_values=variable_values or {},
            context_value=context_value if context_value is not None else graphql_auth_context(),
        )
    )


def test_location_area_crud(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]

    created = _execute(
        _CREATE_AREA,
        {"locationId": loc_id, "name": "  Bar  ", "sortOrder": 1},
    )
    assert not created.errors, created.errors
    area = created.data["createLocationArea"]
    assert area["name"] == "Bar"
    assert area["locationId"] == str(loc_id)
    assert area["sortOrder"] == 1
    area_id = int(area["id"])

    listed = _execute(_LOCATION_AREAS, {"id": str(loc_id)})
    assert not listed.errors, listed.errors
    assert len(listed.data["location"]["areas"]) == 1
    assert listed.data["location"]["areas"][0]["name"] == "Bar"

    updated = _execute(_UPDATE_AREA, {"id": area_id, "name": "Main bar", "sortOrder": 0})
    assert not updated.errors, updated.errors
    assert updated.data["updateLocationArea"]["name"] == "Main bar"
    assert updated.data["updateLocationArea"]["sortOrder"] == 0

    deleted = _execute(_DELETE_AREA, {"id": area_id})
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteLocationArea"] is True

    listed_after = _execute(_LOCATION_AREAS, {"id": str(loc_id)})
    assert not listed_after.errors, listed_after.errors
    assert listed_after.data["location"]["areas"] == []


def test_location_area_rejects_duplicate_name(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    first = _execute(_CREATE_AREA, {"locationId": loc_id, "name": "Bar"})
    assert not first.errors, first.errors
    second = _execute(_CREATE_AREA, {"locationId": loc_id, "name": "Bar"})
    assert second.errors
    assert "already exists" in str(second.errors[0].message).lower()


def test_location_area_requires_owner(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    result = _execute(
        _CREATE_AREA,
        {"locationId": loc_id, "name": "Bar"},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert result.errors


def test_consume_with_area_and_delete_clears_movement_fk(
    inventar_workspace_and_location,
):
    loc_id = inventar_workspace_and_location["location_id"]
    ws_id = inventar_workspace_and_location["workspace_id"]

    area = _execute(_CREATE_AREA, {"locationId": loc_id, "name": "Bar"})
    assert not area.errors, area.errors
    area_id = int(area.data["createLocationArea"]["id"])

    catalog = _execute(
        _CREATE_CATALOG,
        {
            "workspaceId": ws_id,
            "name": "Gin",
            "packageSize": 1.0,
            "packageUnit": "L",
        },
    )
    assert not catalog.errors, catalog.errors
    catalog_id = catalog.data["createInventoryCatalogItem"]["id"]

    received = _execute(
        _RECEIVE_STOCK,
        {"locationId": loc_id, "catalogItemId": catalog_id, "quantity": 5.0},
    )
    assert not received.errors, received.errors
    stock_id = received.data["receiveInventoryStock"]["id"]

    consumed = _execute(
        _CONSUME_STOCK,
        {"stockId": stock_id, "quantity": 1.0, "areaId": area_id},
    )
    assert not consumed.errors, consumed.errors
    assert consumed.data["consumeInventoryStock"]["onHand"] == 4.0

    movements = _execute(
        _MOVEMENTS_QUERY,
        {"locationId": str(loc_id), "catalogItemId": str(catalog_id)},
    )
    assert not movements.errors, movements.errors
    out_rows = [r for r in movements.data["inventoryStockMovements"] if r["direction"] == "out"]
    assert len(out_rows) == 1
    assert out_rows[0]["areaId"] == area_id
    assert out_rows[0]["areaName"] == "Bar"

    unassigned = _execute(_CONSUME_STOCK, {"stockId": stock_id, "quantity": 1.0})
    assert not unassigned.errors, unassigned.errors
    movements2 = _execute(
        _MOVEMENTS_QUERY,
        {"locationId": str(loc_id), "catalogItemId": str(catalog_id)},
    )
    outs = [r for r in movements2.data["inventoryStockMovements"] if r["direction"] == "out"]
    assert outs[0]["areaId"] is None
    assert outs[0]["areaName"] is None

    deleted = _execute(_DELETE_AREA, {"id": area_id})
    assert not deleted.errors, deleted.errors

    movements3 = _execute(
        _MOVEMENTS_QUERY,
        {"locationId": str(loc_id), "catalogItemId": str(catalog_id)},
    )
    assert not movements3.errors, movements3.errors
    tagged = [
        r
        for r in movements3.data["inventoryStockMovements"]
        if r["direction"] == "out" and r["quantity"] == 1.0 and r["areaName"] is None
    ]
    # First out (was Bar) now null after area delete; second was already null.
    assert any(r["areaId"] is None for r in tagged)
    bar_cleared = [
        r
        for r in movements3.data["inventoryStockMovements"]
        if r["direction"] == "out" and r["areaId"] is None
    ]
    assert len(bar_cleared) == 2

    stock_after = SessionLocal()
    try:
        row = stock_after.get(InventoryStock, stock_id)
        assert row is not None
        assert row.on_hand == 3.0
    finally:
        stock_after.close()


def test_consume_rejects_area_from_other_location(inventar_two_locations):
    loc_a = inventar_two_locations["location_id"]
    loc_b = inventar_two_locations["location_id_b"]
    ws_id = inventar_two_locations["workspace_id"]

    area_b = _execute(_CREATE_AREA, {"locationId": loc_b, "name": "Bar B"})
    assert not area_b.errors, area_b.errors
    area_b_id = int(area_b.data["createLocationArea"]["id"])

    catalog = _execute(
        _CREATE_CATALOG,
        {
            "workspaceId": ws_id,
            "name": "Vodka",
            "packageSize": 1.0,
            "packageUnit": "L",
        },
    )
    assert not catalog.errors, catalog.errors
    catalog_id = catalog.data["createInventoryCatalogItem"]["id"]

    received = _execute(
        _RECEIVE_STOCK,
        {"locationId": loc_a, "catalogItemId": catalog_id, "quantity": 2.0},
    )
    assert not received.errors, received.errors
    stock_id = received.data["receiveInventoryStock"]["id"]

    bad = _execute(
        _CONSUME_STOCK,
        {"stockId": stock_id, "quantity": 1.0, "areaId": area_b_id},
    )
    assert bad.errors
    assert "belong" in str(bad.errors[0].message).lower()
