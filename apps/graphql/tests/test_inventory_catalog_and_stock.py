"""Tests for inventar catalog and stock."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

import pytest
from graphql.data_sources import (
    InventoryCatalogItem,
    InventoryStock,
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
  $storageZone: InventoryStorageZone
) {
  createInventoryCatalogItemWithStock(
    locationId: $locationId
    name: $name
    packageSize: $packageSize
    packageUnit: $packageUnit
    onHand: $onHand
    storageZone: $storageZone
  ) {
    id
    locationId
    onHand
    catalogItem {
      id
      name
      packageSize
      packageUnit
      storageZone
    }
  }
}
"""

_CREATE_CATALOG = """
mutation CreateCatalog(
  $workspaceId: Int!
  $name: String!
  $packageSize: Float!
  $packageUnit: String!
  $storageZone: InventoryStorageZone
) {
  createInventoryCatalogItem(
    workspaceId: $workspaceId
    name: $name
    packageSize: $packageSize
    packageUnit: $packageUnit
    storageZone: $storageZone
  ) {
    id
    name
    storageZone
  }
}
"""

_UPDATE_CATALOG = """
mutation UpdateCatalog($id: Int!, $storageZone: InventoryStorageZone) {
  updateInventoryCatalogItem(id: $id, storageZone: $storageZone) {
    id
    storageZone
  }
}
"""

_CATALOG_QUERY = """
query Catalog($workspaceId: ID!) {
  inventoryCatalogItems(workspaceId: $workspaceId) {
    id
    name
    packageSize
    packageUnit
    storageZone
  }
}
"""

_STOCK_QUERY = """
query Stock($locationId: ID!) {
  inventoryStock(locationId: $locationId) {
    id
    onHand
    catalogItem { name packageSize packageUnit storageZone }
  }
}
"""

_UPSERT_STOCK = """
mutation UpsertStock($locationId: Int!, $catalogItemId: Int!, $onHand: Float!) {
  upsertInventoryStock(
    locationId: $locationId
    catalogItemId: $catalogItemId
    onHand: $onHand
  ) {
    id
    onHand
  }
}
"""

_DELETE_STOCK = """
mutation DeleteStock($id: Int!) {
  deleteInventoryStock(id: $id)
}
"""

_DELETE_CATALOG = """
mutation DeleteCatalog($id: Int!) {
  deleteInventoryCatalogItem(id: $id)
}
"""


@pytest.fixture
def inventar_workspace_and_location():
    session = SessionLocal()
    try:
        session.query(InventoryStock).delete()
        session.query(InventoryCatalogItem).delete()
        session.query(Location).delete()
        session.query(WorkspaceMembership).delete()
        session.query(Workspace).delete()
        session.commit()

        now = datetime.now(tz=UTC)
        ws = Workspace(name="Inventar WS", owner_clerk_user_id=GRAPHQL_TEST_USER_ID)
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


def _execute(query: str, variable_values: dict | None = None, context_value: dict | None = None):
    return asyncio.run(
        schema.execute(
            query,
            variable_values=variable_values or {},
            context_value=context_value if context_value is not None else graphql_auth_context(),
        )
    )


def test_create_with_stock_and_list(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    ws_id = inventar_workspace_and_location["workspace_id"]

    result = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Sugar",
            "packageSize": 5.0,
            "packageUnit": "kg",
            "onHand": 2.0,
        },
    )
    assert not result.errors, result.errors
    stock = result.data["createInventoryCatalogItemWithStock"]
    assert stock["onHand"] == 2.0
    assert stock["catalogItem"]["name"] == "Sugar"
    assert stock["catalogItem"]["storageZone"] == "dry"

    stock_list = _execute(_STOCK_QUERY, {"locationId": str(loc_id)})
    assert not stock_list.errors, stock_list.errors
    assert len(stock_list.data["inventoryStock"]) == 1
    assert stock_list.data["inventoryStock"][0]["catalogItem"]["name"] == "Sugar"
    assert stock_list.data["inventoryStock"][0]["catalogItem"]["storageZone"] == "dry"

    catalog_list = _execute(_CATALOG_QUERY, {"workspaceId": str(ws_id)})
    assert not catalog_list.errors, catalog_list.errors
    assert len(catalog_list.data["inventoryCatalogItems"]) == 1
    assert catalog_list.data["inventoryCatalogItems"][0]["storageZone"] == "dry"


def test_storage_zone_create_and_update(inventar_workspace_and_location):
    ws_id = inventar_workspace_and_location["workspace_id"]

    created = _execute(
        _CREATE_CATALOG,
        {
            "workspaceId": ws_id,
            "name": "Ice cream",
            "packageSize": 2.0,
            "packageUnit": "L",
            "storageZone": "freezer",
        },
    )
    assert not created.errors, created.errors
    item = created.data["createInventoryCatalogItem"]
    assert item["storageZone"] == "freezer"

    updated = _execute(
        _UPDATE_CATALOG,
        {"id": item["id"], "storageZone": "cooler"},
    )
    assert not updated.errors, updated.errors
    assert updated.data["updateInventoryCatalogItem"]["storageZone"] == "cooler"


def test_upsert_and_delete_stock(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Sugar",
            "packageSize": 5.0,
            "packageUnit": "kg",
            "onHand": 2.0,
        },
    )
    stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]
    catalog_id = created.data["createInventoryCatalogItemWithStock"]["catalogItem"]["id"]

    updated = _execute(
        _UPSERT_STOCK,
        {"locationId": loc_id, "catalogItemId": catalog_id, "onHand": 4.0},
    )
    assert not updated.errors, updated.errors
    assert updated.data["upsertInventoryStock"]["onHand"] == 4.0

    deleted = _execute(_DELETE_STOCK, {"id": stock_id})
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteInventoryStock"] is True

    stock_list = _execute(_STOCK_QUERY, {"locationId": str(loc_id)})
    assert stock_list.data["inventoryStock"] == []


def test_delete_catalog_cascades_stock(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Sugar",
            "packageSize": 5.0,
            "packageUnit": "kg",
            "onHand": 1.0,
        },
    )
    catalog_id = created.data["createInventoryCatalogItemWithStock"]["catalogItem"]["id"]

    deleted = _execute(_DELETE_CATALOG, {"id": catalog_id})
    assert not deleted.errors, deleted.errors
    assert deleted.data["deleteInventoryCatalogItem"] is True

    stock_list = _execute(_STOCK_QUERY, {"locationId": str(loc_id)})
    assert stock_list.data["inventoryStock"] == []


def test_requires_auth(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    result = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Sugar",
            "packageSize": 5.0,
            "packageUnit": "kg",
            "onHand": 1.0,
        },
        context_value={"user_id": ""},
    )
    assert result.errors


def test_rejects_cross_workspace_stock_link(inventar_workspace_and_location):
    session = SessionLocal()
    try:
        other_ws = Workspace(name="Other WS", owner_clerk_user_id=OTHER_USER_ID)
        session.add(other_ws)
        session.flush()
        foreign_catalog = InventoryCatalogItem(
            workspace_id=other_ws.id,
            name="Foreign Sugar",
            package_size=1.0,
            package_unit="kg",
        )
        session.add(foreign_catalog)
        session.commit()
        session.refresh(foreign_catalog)
        foreign_id = foreign_catalog.id
    finally:
        session.close()

    loc_id = inventar_workspace_and_location["location_id"]
    result = _execute(
        _UPSERT_STOCK,
        {"locationId": loc_id, "catalogItemId": foreign_id, "onHand": 1.0},
    )
    assert result.errors
    assert "workspace" in str(result.errors[0].message).lower()

    session = SessionLocal()
    try:
        session.query(InventoryCatalogItem).filter(InventoryCatalogItem.id == foreign_id).delete()
        session.query(Workspace).filter(Workspace.id == other_ws.id).delete()
        session.commit()
    finally:
        session.close()


def test_validation_negative_on_hand(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    result = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Sugar",
            "packageSize": 5.0,
            "packageUnit": "kg",
            "onHand": -1.0,
        },
    )
    assert result.errors


_TRANSFER_STOCK = """
mutation TransferStock($fromStockId: Int!, $toLocationId: Int!, $quantity: Float!) {
  transferInventoryStock(
    fromStockId: $fromStockId
    toLocationId: $toLocationId
    quantity: $quantity
  ) {
    fromLocationId
    toLocationId
    fromStock { id onHand locationId }
    toStock { id onHand locationId catalogItem { id name } }
  }
}
"""


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
    session = SessionLocal()
    try:
        session.query(InventoryStock).filter(InventoryStock.location_id == second_id).delete()
        session.query(Location).filter(Location.id == second_id).delete()
        session.commit()
    finally:
        session.close()


def test_transfer_partial_creates_destination(inventar_two_locations):
    loc_a = inventar_two_locations["location_id"]
    loc_b = inventar_two_locations["location_id_b"]

    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_a,
            "name": "Sugar",
            "packageSize": 5.0,
            "packageUnit": "kg",
            "onHand": 4.0,
        },
    )
    assert not created.errors, created.errors
    from_stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]

    transferred = _execute(
        _TRANSFER_STOCK,
        {"fromStockId": from_stock_id, "toLocationId": loc_b, "quantity": 1.5},
    )
    assert not transferred.errors, transferred.errors
    payload = transferred.data["transferInventoryStock"]
    assert payload["fromLocationId"] == loc_a
    assert payload["toLocationId"] == loc_b
    assert payload["fromStock"]["onHand"] == 2.5
    assert payload["toStock"]["onHand"] == 1.5
    assert payload["toStock"]["locationId"] == loc_b
    assert payload["toStock"]["catalogItem"]["name"] == "Sugar"

    stock_a = _execute(_STOCK_QUERY, {"locationId": str(loc_a)})
    stock_b = _execute(_STOCK_QUERY, {"locationId": str(loc_b)})
    assert stock_a.data["inventoryStock"][0]["onHand"] == 2.5
    assert stock_b.data["inventoryStock"][0]["onHand"] == 1.5


def test_transfer_full_deletes_source_and_increments_dest(inventar_two_locations):
    loc_a = inventar_two_locations["location_id"]
    loc_b = inventar_two_locations["location_id_b"]

    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_a,
            "name": "Flour",
            "packageSize": 1.0,
            "packageUnit": "kg",
            "onHand": 3.0,
        },
    )
    from_stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]
    catalog_id = created.data["createInventoryCatalogItemWithStock"]["catalogItem"]["id"]

    seeded_b = _execute(
        _UPSERT_STOCK,
        {"locationId": loc_b, "catalogItemId": catalog_id, "onHand": 2.0},
    )
    assert not seeded_b.errors, seeded_b.errors

    transferred = _execute(
        _TRANSFER_STOCK,
        {"fromStockId": from_stock_id, "toLocationId": loc_b, "quantity": 3.0},
    )
    assert not transferred.errors, transferred.errors
    payload = transferred.data["transferInventoryStock"]
    assert payload["fromStock"] is None
    assert payload["toStock"]["onHand"] == 5.0

    stock_a = _execute(_STOCK_QUERY, {"locationId": str(loc_a)})
    assert stock_a.data["inventoryStock"] == []


def test_transfer_rejects_over_quantity(inventar_two_locations):
    loc_a = inventar_two_locations["location_id"]
    loc_b = inventar_two_locations["location_id_b"]
    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_a,
            "name": "Salt",
            "packageSize": 1.0,
            "packageUnit": "kg",
            "onHand": 2.0,
        },
    )
    from_stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]
    result = _execute(
        _TRANSFER_STOCK,
        {"fromStockId": from_stock_id, "toLocationId": loc_b, "quantity": 5.0},
    )
    assert result.errors
    assert "exceed" in str(result.errors[0].message).lower()


def test_transfer_rejects_same_location(inventar_two_locations):
    loc_a = inventar_two_locations["location_id"]
    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_a,
            "name": "Oil",
            "packageSize": 1.0,
            "packageUnit": "L",
            "onHand": 2.0,
        },
    )
    from_stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]
    result = _execute(
        _TRANSFER_STOCK,
        {"fromStockId": from_stock_id, "toLocationId": loc_a, "quantity": 1.0},
    )
    assert result.errors
    assert "same location" in str(result.errors[0].message).lower()


def test_transfer_rejects_unauthorized_destination(inventar_two_locations):
    loc_a = inventar_two_locations["location_id"]
    session = SessionLocal()
    try:
        foreign = Location(
            name="Foreign cafe",
            workspace_id=None,
            clerk_user_id=OTHER_USER_ID,
        )
        session.add(foreign)
        session.commit()
        session.refresh(foreign)
        foreign_id = foreign.id
    finally:
        session.close()

    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_a,
            "name": "Rice",
            "packageSize": 5.0,
            "packageUnit": "kg",
            "onHand": 2.0,
        },
    )
    from_stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]
    result = _execute(
        _TRANSFER_STOCK,
        {"fromStockId": from_stock_id, "toLocationId": foreign_id, "quantity": 1.0},
    )
    assert result.errors

    session = SessionLocal()
    try:
        session.query(Location).filter(Location.id == foreign_id).delete()
        session.commit()
    finally:
        session.close()
