"""Idempotent inventar seed helpers used by make dev-data."""

from __future__ import annotations

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
from graphql.scripts.dev_seed_inventar import reset_inventar, seed_inventar
from graphql.scripts.load_dev_data import DEV_INVENTAR_LOCATION_NAME

SEED_USER = "clerk_dev_seed_inventar_test"


@pytest.fixture
def inventar_seed_workspace():
    session = SessionLocal()
    try:
        now = datetime.now(tz=UTC)
        ws = Workspace(name="Dev Seed Inventar WS", owner_clerk_user_id=SEED_USER)
        session.add(ws)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=ws.id,
                clerk_user_id=SEED_USER,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        inventar = Location(
            name=DEV_INVENTAR_LOCATION_NAME,
            workspace_id=ws.id,
            clerk_user_id=SEED_USER,
            currency="IDR",
        )
        session.add(inventar)
        session.commit()
        session.refresh(ws)
        session.refresh(inventar)
        payload = {
            "workspace_id": ws.id,
            "inventar_id": inventar.id,
        }
    finally:
        session.close()

    yield payload

    session = SessionLocal()
    try:
        reset_inventar(session, payload["workspace_id"])
        session.query(Location).filter(Location.workspace_id == payload["workspace_id"]).delete()
        session.query(WorkspaceMembership).filter(
            WorkspaceMembership.workspace_id == payload["workspace_id"]
        ).delete()
        session.query(Workspace).filter(Workspace.id == payload["workspace_id"]).delete()
        session.commit()
    finally:
        session.close()


def test_inventar_seed_is_idempotent(inventar_seed_workspace):
    session = SessionLocal()
    try:
        ws = session.get(Workspace, inventar_seed_workspace["workspace_id"])
        inventar = session.get(Location, inventar_seed_workspace["inventar_id"])
        assert ws is not None and inventar is not None

        reset_inventar(session, ws.id)
        first = seed_inventar(session, ws, inventar)
        session.commit()

        catalog_n = (
            session.query(InventoryCatalogItem)
            .filter(InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"])
            .count()
        )
        stock_n = (
            session.query(InventoryStock)
            .filter(InventoryStock.location_id == inventar_seed_workspace["inventar_id"])
            .count()
        )
        movement_n = (
            session.query(InventoryStockMovement)
            .filter(InventoryStockMovement.location_id == inventar_seed_workspace["inventar_id"])
            .count()
        )

        assert first["catalog_items"] == 6
        assert first["stock_rows"] == stock_n
        assert first["movements"] == movement_n
        assert catalog_n == 6
        assert stock_n == 6
        # 6 receives + beras 14 + tahu 3 + kangkung 14 + pecel 2 + santan 4 = 43
        assert movement_n == 43

        beras = (
            session.query(InventoryCatalogItem)
            .filter(
                InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"],
                InventoryCatalogItem.name == "Beras Cianjur",
            )
            .one()
        )
        assert beras.storage_zone == "dry"
        assert beras.category == "dry_goods"

        beras_stock = (
            session.query(InventoryStock)
            .filter(
                InventoryStock.location_id == inventar_seed_workspace["inventar_id"],
                InventoryStock.catalog_item_id == beras.id,
            )
            .one()
        )
        assert beras_stock.on_hand == 4.0
        assert beras_stock.min_on_hand == 2.0
        assert beras_stock.max_on_hand == 10.0

        beras_outs = (
            session.query(InventoryStockMovement)
            .filter(
                InventoryStockMovement.location_id == inventar_seed_workspace["inventar_id"],
                InventoryStockMovement.catalog_item_id == beras.id,
                InventoryStockMovement.direction == "out",
            )
            .count()
        )
        assert beras_outs == 14

        gula = (
            session.query(InventoryCatalogItem)
            .filter(
                InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"],
                InventoryCatalogItem.name == "Gula Aren",
            )
            .one()
        )
        gula_outs = (
            session.query(InventoryStockMovement)
            .filter(
                InventoryStockMovement.catalog_item_id == gula.id,
                InventoryStockMovement.direction.in_(("out", "transfer_out")),
            )
            .count()
        )
        assert gula_outs == 0

        reset_inventar(session, inventar_seed_workspace["workspace_id"])
        ws = session.get(Workspace, inventar_seed_workspace["workspace_id"])
        inventar = session.get(Location, inventar_seed_workspace["inventar_id"])
        assert ws is not None and inventar is not None
        second = seed_inventar(session, ws, inventar)
        session.commit()

        assert second == first
        assert (
            session.query(InventoryCatalogItem)
            .filter(InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"])
            .count()
            == catalog_n
        )
        assert (
            session.query(InventoryStock)
            .filter(InventoryStock.location_id == inventar_seed_workspace["inventar_id"])
            .count()
            == stock_n
        )
        assert (
            session.query(InventoryStockMovement)
            .filter(InventoryStockMovement.location_id == inventar_seed_workspace["inventar_id"])
            .count()
            == movement_n
        )
    finally:
        session.close()


def test_clear_inventar_removes_rows_keeps_locations(inventar_seed_workspace):
    from graphql.scripts.load_dev_data import main as load_dev_data_main

    session = SessionLocal()
    try:
        ws = session.get(Workspace, inventar_seed_workspace["workspace_id"])
        inventar = session.get(Location, inventar_seed_workspace["inventar_id"])
        assert ws is not None and inventar is not None

        reset_inventar(session, ws.id)
        seed_inventar(session, ws, inventar)
        session.commit()

        assert (
            session.query(InventoryCatalogItem)
            .filter(InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"])
            .count()
            == 6
        )
    finally:
        session.close()

    assert (
        load_dev_data_main(
            scope="clear-inventar",
            clerk_user_id=SEED_USER,
            excel_path=None,
            cogs_path=None,
        )
        == 0
    )

    session = SessionLocal()
    try:
        inventar_id = inventar_seed_workspace["inventar_id"]
        assert (
            session.query(InventoryCatalogItem)
            .filter(InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"])
            .count()
            == 0
        )
        assert (
            session.query(InventoryStock).filter(InventoryStock.location_id == inventar_id).count()
            == 0
        )
        assert (
            session.query(InventoryStockMovement)
            .filter(InventoryStockMovement.location_id == inventar_id)
            .count()
            == 0
        )
        assert session.get(Location, inventar_id) is not None
        assert session.get(Workspace, inventar_seed_workspace["workspace_id"]) is not None
    finally:
        session.close()
