"""Tests for inventar catalog and stock."""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

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
  $storageZone: InventoryStorageZone
  $price: Float
  $minOnHand: Float
  $maxOnHand: Float
) {
  createInventoryCatalogItemWithStock(
    locationId: $locationId
    name: $name
    packageSize: $packageSize
    packageUnit: $packageUnit
    onHand: $onHand
    storageZone: $storageZone
    price: $price
    minOnHand: $minOnHand
    maxOnHand: $maxOnHand
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
      price
      minOnHand
      maxOnHand
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
  $price: Float
  $minOnHand: Float
  $maxOnHand: Float
) {
  createInventoryCatalogItem(
    workspaceId: $workspaceId
    name: $name
    packageSize: $packageSize
    packageUnit: $packageUnit
    storageZone: $storageZone
    price: $price
    minOnHand: $minOnHand
    maxOnHand: $maxOnHand
  ) {
    id
    name
    storageZone
    price
    minOnHand
    maxOnHand
  }
}
"""

_UPDATE_CATALOG = """
mutation UpdateCatalog(
  $id: Int!
  $storageZone: InventoryStorageZone
  $price: Float
  $minOnHand: Float
  $maxOnHand: Float
) {
  updateInventoryCatalogItem(
    id: $id
    storageZone: $storageZone
    price: $price
    minOnHand: $minOnHand
    maxOnHand: $maxOnHand
  ) {
    id
    storageZone
    price
    minOnHand
    maxOnHand
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
    price
    minOnHand
    maxOnHand
  }
}
"""

_STOCK_QUERY = """
query Stock($locationId: ID!) {
  inventoryStock(locationId: $locationId) {
    id
    onHand
    catalogItem { name packageSize packageUnit storageZone price minOnHand maxOnHand }
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
        session.query(InventoryStockMovement).delete()
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


def test_catalog_price_create_update_and_reject_negative(inventar_workspace_and_location):
    ws_id = inventar_workspace_and_location["workspace_id"]
    loc_id = inventar_workspace_and_location["location_id"]

    created = _execute(
        _CREATE_CATALOG,
        {
            "workspaceId": ws_id,
            "name": "Gula",
            "packageSize": 1.0,
            "packageUnit": "kg",
            "price": 15000.0,
        },
    )
    assert not created.errors, created.errors
    item = created.data["createInventoryCatalogItem"]
    assert item["price"] == 15000.0

    updated = _execute(
        _UPDATE_CATALOG,
        {"id": item["id"], "price": 16000.0},
    )
    assert not updated.errors, updated.errors
    assert updated.data["updateInventoryCatalogItem"]["price"] == 16000.0

    cleared = _execute(
        _UPDATE_CATALOG,
        {"id": item["id"], "price": None},
    )
    assert not cleared.errors, cleared.errors
    assert cleared.data["updateInventoryCatalogItem"]["price"] is None

    negative = _execute(
        _CREATE_CATALOG,
        {
            "workspaceId": ws_id,
            "name": "Bad price",
            "packageSize": 1.0,
            "packageUnit": "kg",
            "price": -1.0,
        },
    )
    assert negative.errors

    with_stock = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Flour",
            "packageSize": 5.0,
            "packageUnit": "kg",
            "onHand": 3.0,
            "price": 25000.0,
        },
    )
    assert not with_stock.errors, with_stock.errors
    assert with_stock.data["createInventoryCatalogItemWithStock"]["catalogItem"]["price"] == 25000.0

    stock_list = _execute(_STOCK_QUERY, {"locationId": str(loc_id)})
    assert not stock_list.errors, stock_list.errors
    flour = next(
        row
        for row in stock_list.data["inventoryStock"]
        if row["catalogItem"]["name"] == "Flour"
    )
    assert flour["catalogItem"]["price"] == 25000.0
    assert flour["onHand"] == 3.0


def test_catalog_on_hand_limits_create_update_and_validation(inventar_workspace_and_location):
    ws_id = inventar_workspace_and_location["workspace_id"]
    loc_id = inventar_workspace_and_location["location_id"]

    created = _execute(
        _CREATE_CATALOG,
        {
            "workspaceId": ws_id,
            "name": "Rice",
            "packageSize": 5.0,
            "packageUnit": "kg",
            "minOnHand": 2.0,
            "maxOnHand": 10.0,
        },
    )
    assert not created.errors, created.errors
    item = created.data["createInventoryCatalogItem"]
    assert item["minOnHand"] == 2.0
    assert item["maxOnHand"] == 10.0

    updated = _execute(
        _UPDATE_CATALOG,
        {"id": item["id"], "minOnHand": 3.0, "maxOnHand": 12.0},
    )
    assert not updated.errors, updated.errors
    assert updated.data["updateInventoryCatalogItem"]["minOnHand"] == 3.0
    assert updated.data["updateInventoryCatalogItem"]["maxOnHand"] == 12.0

    cleared = _execute(
        _UPDATE_CATALOG,
        {"id": item["id"], "minOnHand": None, "maxOnHand": None},
    )
    assert not cleared.errors, cleared.errors
    assert cleared.data["updateInventoryCatalogItem"]["minOnHand"] is None
    assert cleared.data["updateInventoryCatalogItem"]["maxOnHand"] is None

    inverted = _execute(
        _CREATE_CATALOG,
        {
            "workspaceId": ws_id,
            "name": "Bad limits",
            "packageSize": 1.0,
            "packageUnit": "kg",
            "minOnHand": 5.0,
            "maxOnHand": 2.0,
        },
    )
    assert inverted.errors

    negative = _execute(
        _CREATE_CATALOG,
        {
            "workspaceId": ws_id,
            "name": "Negative min",
            "packageSize": 1.0,
            "packageUnit": "kg",
            "minOnHand": -1.0,
        },
    )
    assert negative.errors

    with_stock = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Oil",
            "packageSize": 1.0,
            "packageUnit": "L",
            "onHand": 4.0,
            "minOnHand": 1.0,
            "maxOnHand": 8.0,
        },
    )
    assert not with_stock.errors, with_stock.errors
    catalog = with_stock.data["createInventoryCatalogItemWithStock"]["catalogItem"]
    assert catalog["minOnHand"] == 1.0
    assert catalog["maxOnHand"] == 8.0

    stock_list = _execute(_STOCK_QUERY, {"locationId": str(loc_id)})
    assert not stock_list.errors, stock_list.errors
    oil = next(
        row
        for row in stock_list.data["inventoryStock"]
        if row["catalogItem"]["name"] == "Oil"
    )
    assert oil["catalogItem"]["minOnHand"] == 1.0
    assert oil["catalogItem"]["maxOnHand"] == 8.0


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
        session.query(InventoryStockMovement).filter(
            InventoryStockMovement.location_id == second_id
        ).delete()
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


_RECEIVE_STOCK = """
mutation ReceiveStock(
  $locationId: Int!
  $catalogItemId: Int!
  $quantity: Float!
  $occurredOn: Date
) {
  receiveInventoryStock(
    locationId: $locationId
    catalogItemId: $catalogItemId
    quantity: $quantity
    occurredOn: $occurredOn
  ) {
    id
    onHand
    lastInOn
    lastOutOn
    catalogItemId
  }
}
"""

_CONSUME_STOCK = """
mutation ConsumeStock($stockId: Int!, $quantity: Float!, $occurredOn: Date) {
  consumeInventoryStock(stockId: $stockId, quantity: $quantity, occurredOn: $occurredOn) {
    id
    onHand
    lastInOn
    lastOutOn
  }
}
"""

_MOVEMENTS_QUERY = """
query Movements(
  $locationId: ID!
  $catalogItemId: ID!
  $stockId: ID
  $fromDate: Date
  $toDate: Date
  $limit: Int
) {
  inventoryStockMovements(
    locationId: $locationId
    catalogItemId: $catalogItemId
    stockId: $stockId
    fromDate: $fromDate
    toDate: $toDate
    limit: $limit
  ) {
    id
    direction
    quantity
    occurredOn
    stockId
    relatedMovementId
    relatedLocationId
  }
}
"""

_TRANSFER_STOCK_DATED = """
mutation TransferStockDated(
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
    fromLocationId
    toLocationId
    fromStock { id onHand lastOutOn }
    toStock { id onHand lastInOn catalogItem { id } }
  }
}
"""


def test_receive_and_consume_record_movements(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    ws_id = inventar_workspace_and_location["workspace_id"]

    catalog = _execute(
        _CREATE_CATALOG,
        {
            "workspaceId": ws_id,
            "name": "Sugar",
            "packageSize": 5.0,
            "packageUnit": "kg",
        },
    )
    assert not catalog.errors, catalog.errors
    catalog_id = catalog.data["createInventoryCatalogItem"]["id"]

    received = _execute(
        _RECEIVE_STOCK,
        {
            "locationId": loc_id,
            "catalogItemId": catalog_id,
            "quantity": 3.0,
            "occurredOn": "2026-08-28",
        },
    )
    assert not received.errors, received.errors
    stock = received.data["receiveInventoryStock"]
    assert stock["onHand"] == 3.0
    assert stock["lastInOn"] == "2026-08-28"
    assert stock["lastOutOn"] is None
    stock_id = stock["id"]

    received_again = _execute(
        _RECEIVE_STOCK,
        {
            "locationId": loc_id,
            "catalogItemId": catalog_id,
            "quantity": 2.0,
            "occurredOn": "2026-08-30",
        },
    )
    assert not received_again.errors, received_again.errors
    assert received_again.data["receiveInventoryStock"]["onHand"] == 5.0
    assert received_again.data["receiveInventoryStock"]["lastInOn"] == "2026-08-30"

    consumed = _execute(
        _CONSUME_STOCK,
        {"stockId": stock_id, "quantity": 1.5, "occurredOn": "2026-08-31"},
    )
    assert not consumed.errors, consumed.errors
    assert consumed.data["consumeInventoryStock"]["onHand"] == 3.5
    assert consumed.data["consumeInventoryStock"]["lastOutOn"] == "2026-08-31"

    movements = _execute(
        _MOVEMENTS_QUERY,
        {"locationId": str(loc_id), "catalogItemId": str(catalog_id)},
    )
    assert not movements.errors, movements.errors
    rows = movements.data["inventoryStockMovements"]
    assert len(rows) == 3
    assert rows[0]["direction"] == "out"
    assert rows[0]["quantity"] == 1.5
    assert rows[0]["occurredOn"] == "2026-08-31"
    assert rows[0]["relatedLocationId"] is None
    assert rows[1]["direction"] == "in"
    assert rows[1]["occurredOn"] == "2026-08-30"
    assert rows[1]["relatedLocationId"] is None
    assert rows[2]["direction"] == "in"
    assert rows[2]["occurredOn"] == "2026-08-28"
    assert rows[2]["relatedLocationId"] is None


def test_movements_filter_by_occurred_on_date_range(inventar_workspace_and_location):
    loc_id = inventar_workspace_and_location["location_id"]
    ws_id = inventar_workspace_and_location["workspace_id"]

    catalog = _execute(
        _CREATE_CATALOG,
        {
            "workspaceId": ws_id,
            "name": "Flour",
            "packageSize": 1.0,
            "packageUnit": "kg",
        },
    )
    assert not catalog.errors, catalog.errors
    catalog_id = catalog.data["createInventoryCatalogItem"]["id"]

    for day, qty in (
        ("2026-08-01", 1.0),
        ("2026-08-15", 2.0),
        ("2026-08-31", 3.0),
    ):
        received = _execute(
            _RECEIVE_STOCK,
            {
                "locationId": loc_id,
                "catalogItemId": catalog_id,
                "quantity": qty,
                "occurredOn": day,
            },
        )
        assert not received.errors, received.errors

    mid = _execute(
        _MOVEMENTS_QUERY,
        {
            "locationId": str(loc_id),
            "catalogItemId": str(catalog_id),
            "fromDate": "2026-08-10",
            "toDate": "2026-08-20",
        },
    )
    assert not mid.errors, mid.errors
    mid_rows = mid.data["inventoryStockMovements"]
    assert len(mid_rows) == 1
    assert mid_rows[0]["occurredOn"] == "2026-08-15"
    assert mid_rows[0]["quantity"] == 2.0

    inclusive = _execute(
        _MOVEMENTS_QUERY,
        {
            "locationId": str(loc_id),
            "catalogItemId": str(catalog_id),
            "fromDate": "2026-08-15",
            "toDate": "2026-08-31",
        },
    )
    assert not inclusive.errors, inclusive.errors
    inclusive_rows = inclusive.data["inventoryStockMovements"]
    assert [r["occurredOn"] for r in inclusive_rows] == ["2026-08-31", "2026-08-15"]

    inverted = _execute(
        _MOVEMENTS_QUERY,
        {
            "locationId": str(loc_id),
            "catalogItemId": str(catalog_id),
            "fromDate": "2026-08-31",
            "toDate": "2026-08-01",
        },
    )
    assert not inverted.errors, inverted.errors
    assert inverted.data["inventoryStockMovements"] == []

    limited = _execute(
        _MOVEMENTS_QUERY,
        {
            "locationId": str(loc_id),
            "catalogItemId": str(catalog_id),
            "fromDate": "2026-08-01",
            "toDate": "2026-08-31",
            "limit": 1,
        },
    )
    assert not limited.errors, limited.errors
    limited_rows = limited.data["inventoryStockMovements"]
    assert len(limited_rows) == 1
    assert limited_rows[0]["occurredOn"] == "2026-08-31"


def test_consume_rejects_over_quantity(inventar_workspace_and_location):
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
    result = _execute(_CONSUME_STOCK, {"stockId": stock_id, "quantity": 5.0})
    assert result.errors
    assert "exceed" in str(result.errors[0].message).lower()


def test_movements_survive_stock_delete(inventar_workspace_and_location):
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

    deleted = _execute(_DELETE_STOCK, {"id": stock_id})
    assert not deleted.errors, deleted.errors

    movements = _execute(
        _MOVEMENTS_QUERY,
        {"locationId": str(loc_id), "catalogItemId": str(catalog_id)},
    )
    assert not movements.errors, movements.errors
    rows = movements.data["inventoryStockMovements"]
    assert len(rows) == 1
    assert rows[0]["direction"] == "in"
    assert rows[0]["stockId"] is None


def test_movements_scoped_to_current_stock_after_retrack(inventar_workspace_and_location):
    """History for a stock row excludes orphaned movements from a prior track."""
    loc_id = inventar_workspace_and_location["location_id"]
    created = _execute(
        _CREATE_WITH_STOCK,
        {
            "locationId": loc_id,
            "name": "Sugar",
            "packageSize": 5.0,
            "packageUnit": "kg",
            "onHand": 5.0,
        },
    )
    old_stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]
    catalog_id = created.data["createInventoryCatalogItemWithStock"]["catalogItem"]["id"]

    _execute(_CONSUME_STOCK, {"stockId": old_stock_id, "quantity": 2.0})
    deleted = _execute(_DELETE_STOCK, {"id": old_stock_id})
    assert not deleted.errors, deleted.errors

    received = _execute(
        _RECEIVE_STOCK,
        {
            "locationId": loc_id,
            "catalogItemId": int(catalog_id),
            "quantity": 4.0,
            "occurredOn": "2026-08-31",
        },
    )
    assert not received.errors, received.errors
    new_stock_id = received.data["receiveInventoryStock"]["id"]
    assert received.data["receiveInventoryStock"]["onHand"] == 4.0

    all_rows = _execute(
        _MOVEMENTS_QUERY,
        {"locationId": str(loc_id), "catalogItemId": str(catalog_id)},
    ).data["inventoryStockMovements"]
    assert len(all_rows) == 3  # old in, old out, new in
    linked = [r for r in all_rows if r["stockId"] is not None]
    orphaned = [r for r in all_rows if r["stockId"] is None]
    assert len(orphaned) == 2
    assert len(linked) == 1
    assert str(linked[0]["stockId"]) == str(new_stock_id)
    assert linked[0]["quantity"] == 4.0

    scoped = _execute(
        _MOVEMENTS_QUERY,
        {
            "locationId": str(loc_id),
            "catalogItemId": str(catalog_id),
            "stockId": str(new_stock_id),
        },
    )
    assert not scoped.errors, scoped.errors
    rows = scoped.data["inventoryStockMovements"]
    assert len(rows) == 1
    assert rows[0]["direction"] == "in"
    assert rows[0]["quantity"] == 4.0
    assert str(rows[0]["stockId"]) == str(new_stock_id)


def test_transfer_writes_paired_movements(inventar_two_locations):
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
    from_stock_id = created.data["createInventoryCatalogItemWithStock"]["id"]
    catalog_id = created.data["createInventoryCatalogItemWithStock"]["catalogItem"]["id"]

    transferred = _execute(
        _TRANSFER_STOCK_DATED,
        {
            "fromStockId": from_stock_id,
            "toLocationId": loc_b,
            "quantity": 1.5,
            "occurredOn": "2026-08-29",
        },
    )
    assert not transferred.errors, transferred.errors
    payload = transferred.data["transferInventoryStock"]
    assert payload["fromStock"]["lastOutOn"] == "2026-08-29"
    assert payload["toStock"]["lastInOn"] == "2026-08-29"

    mov_a = _execute(
        _MOVEMENTS_QUERY,
        {"locationId": str(loc_a), "catalogItemId": str(catalog_id)},
    )
    mov_b = _execute(
        _MOVEMENTS_QUERY,
        {"locationId": str(loc_b), "catalogItemId": str(catalog_id)},
    )
    out_rows = [r for r in mov_a.data["inventoryStockMovements"] if r["direction"] == "transfer_out"]
    in_rows = [r for r in mov_b.data["inventoryStockMovements"] if r["direction"] == "transfer_in"]
    assert len(out_rows) == 1
    assert len(in_rows) == 1
    assert out_rows[0]["relatedMovementId"] == in_rows[0]["id"]
    assert in_rows[0]["relatedMovementId"] == out_rows[0]["id"]
    assert out_rows[0]["relatedLocationId"] == loc_b
    assert in_rows[0]["relatedLocationId"] == loc_a


def test_movements_query_unauthorized_returns_empty(inventar_workspace_and_location):
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
    result = _execute(
        _MOVEMENTS_QUERY,
        {"locationId": str(loc_id), "catalogItemId": str(catalog_id)},
        context_value={"user_id": OTHER_USER_ID},
    )
    assert not result.errors, result.errors
    assert result.data["inventoryStockMovements"] == []
