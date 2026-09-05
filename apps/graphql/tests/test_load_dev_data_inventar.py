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
        primary = Location(
            name="SNABB",
            workspace_id=ws.id,
            clerk_user_id=SEED_USER,
            currency="IDR",
        )
        branch = Location(
            name="SNABB Branch",
            workspace_id=ws.id,
            clerk_user_id=SEED_USER,
            currency="IDR",
        )
        session.add(primary)
        session.add(branch)
        session.commit()
        session.refresh(ws)
        session.refresh(primary)
        session.refresh(branch)
        payload = {
            "workspace_id": ws.id,
            "primary_id": primary.id,
            "branch_id": branch.id,
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
        primary = session.get(Location, inventar_seed_workspace["primary_id"])
        branch = session.get(Location, inventar_seed_workspace["branch_id"])
        assert ws is not None and primary is not None and branch is not None

        reset_inventar(session, ws.id)
        first = seed_inventar(session, ws, primary, branch)
        session.commit()

        catalog_n = (
            session.query(InventoryCatalogItem)
            .filter(InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"])
            .count()
        )
        stock_n = (
            session.query(InventoryStock)
            .filter(
                InventoryStock.location_id.in_(
                    [
                        inventar_seed_workspace["primary_id"],
                        inventar_seed_workspace["branch_id"],
                    ]
                )
            )
            .count()
        )
        movement_n = (
            session.query(InventoryStockMovement)
            .filter(
                InventoryStockMovement.location_id.in_(
                    [
                        inventar_seed_workspace["primary_id"],
                        inventar_seed_workspace["branch_id"],
                    ]
                )
            )
            .count()
        )

        assert first["catalog_items"] == 4
        assert first["stock_rows"] == stock_n
        assert first["movements"] == movement_n
        assert catalog_n == 4
        assert stock_n >= 4
        # Oat 14 outs + beans 3 outs + berries 4 outs + 1 transfer pair + receives
        assert movement_n >= 20

        oat = (
            session.query(InventoryCatalogItem)
            .filter(
                InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"],
                InventoryCatalogItem.name == "Oat milk",
            )
            .one()
        )
        assert oat.storage_zone == "cooler"
        assert oat.min_on_hand == 2.0
        assert oat.max_on_hand == 12.0

        oat_stock = (
            session.query(InventoryStock)
            .filter(
                InventoryStock.location_id == inventar_seed_workspace["primary_id"],
                InventoryStock.catalog_item_id == oat.id,
            )
            .one()
        )
        assert oat_stock.on_hand == 3.0

        oat_outs = (
            session.query(InventoryStockMovement)
            .filter(
                InventoryStockMovement.location_id == inventar_seed_workspace["primary_id"],
                InventoryStockMovement.catalog_item_id == oat.id,
                InventoryStockMovement.direction == "out",
            )
            .count()
        )
        assert oat_outs == 14

        soap = (
            session.query(InventoryCatalogItem)
            .filter(
                InventoryCatalogItem.workspace_id == inventar_seed_workspace["workspace_id"],
                InventoryCatalogItem.name == "Dish soap",
            )
            .one()
        )
        soap_outs = (
            session.query(InventoryStockMovement)
            .filter(
                InventoryStockMovement.catalog_item_id == soap.id,
                InventoryStockMovement.direction.in_(("out", "transfer_out")),
            )
            .count()
        )
        assert soap_outs == 0

        reset_inventar(session, inventar_seed_workspace["workspace_id"])
        ws = session.get(Workspace, inventar_seed_workspace["workspace_id"])
        primary = session.get(Location, inventar_seed_workspace["primary_id"])
        branch = session.get(Location, inventar_seed_workspace["branch_id"])
        assert ws is not None and primary is not None and branch is not None
        second = seed_inventar(session, ws, primary, branch)
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
            .filter(
                InventoryStock.location_id.in_(
                    [
                        inventar_seed_workspace["primary_id"],
                        inventar_seed_workspace["branch_id"],
                    ]
                )
            )
            .count()
            == stock_n
        )
        assert (
            session.query(InventoryStockMovement)
            .filter(
                InventoryStockMovement.location_id.in_(
                    [
                        inventar_seed_workspace["primary_id"],
                        inventar_seed_workspace["branch_id"],
                    ]
                )
            )
            .count()
            == movement_n
        )
    finally:
        session.close()
