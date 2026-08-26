"""Validation and helpers for relaxed inventar (catalog + stock)."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
from graphql.data_sources.models.inventory_stock import InventoryStock
from graphql.data_sources.models.location import Location


def validate_catalog_fields(
    *,
    name: str,
    package_size: float,
    package_unit: str,
) -> tuple[str, float, str]:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Name cannot be empty")
    if len(name_clean) > 256:
        raise ValueError("Name is too long")
    if not isinstance(package_size, (int, float)) or package_size <= 0:
        raise ValueError("packageSize must be greater than 0")
    unit_clean = package_unit.strip()
    if not unit_clean:
        raise ValueError("packageUnit cannot be empty")
    if len(unit_clean) > 32:
        raise ValueError("packageUnit is too long")
    return name_clean, float(package_size), unit_clean


def validate_on_hand(on_hand: float) -> float:
    if not isinstance(on_hand, (int, float)) or on_hand < 0:
        raise ValueError("onHand must be zero or greater")
    return float(on_hand)


def assert_catalog_matches_location_workspace(
    session: Session,
    catalog_item: InventoryCatalogItem,
    location: Location,
) -> None:
    if location.workspace_id is None:
        raise ValueError("Location is not linked to a workspace")
    if catalog_item.workspace_id != location.workspace_id:
        raise ValueError("Catalog item does not belong to this location's workspace")


def get_catalog_item_or_raise(session: Session, catalog_item_id: int) -> InventoryCatalogItem:
    row = session.get(InventoryCatalogItem, catalog_item_id)
    if row is None:
        raise ValueError("Catalog item not found")
    return row


def get_location_or_raise(session: Session, location_id: int) -> Location:
    row = session.get(Location, location_id)
    if row is None:
        raise ValueError("Location not found")
    return row


def load_stock_with_catalog(session: Session, stock_id: int) -> InventoryStock:
    row = session.scalars(
        select(InventoryStock)
        .options(joinedload(InventoryStock.catalog_item))
        .where(InventoryStock.id == stock_id)
    ).one()
    return row
