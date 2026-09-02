"""Validation and helpers for relaxed inventar (catalog + stock)."""

from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
from graphql.data_sources.models.inventory_stock import InventoryStock
from graphql.data_sources.models.inventory_stock_movement import InventoryStockMovement
from graphql.data_sources.models.location import Location
from graphql.schema.types.inventory_catalog_item import InventoryStorageZone

_ALLOWED_STORAGE_ZONES = {zone.value for zone in InventoryStorageZone}
_DEFAULT_STORAGE_ZONE = InventoryStorageZone.dry.value

DIRECTION_IN = "in"
DIRECTION_OUT = "out"
DIRECTION_TRANSFER_IN = "transfer_in"
DIRECTION_TRANSFER_OUT = "transfer_out"


def validate_storage_zone(storage_zone: str | InventoryStorageZone | None) -> str:
    if storage_zone is None:
        return _DEFAULT_STORAGE_ZONE
    if isinstance(storage_zone, InventoryStorageZone):
        return storage_zone.value
    zone_clean = storage_zone.strip().lower()
    if zone_clean not in _ALLOWED_STORAGE_ZONES:
        raise ValueError("storageZone must be freezer, cooler, or dry")
    return zone_clean


def validate_catalog_price(price: float | None) -> float | None:
    if price is None:
        return None
    if not isinstance(price, (int, float)) or price < 0:
        raise ValueError("price must be zero or greater")
    return float(price)


def validate_catalog_on_hand_limits(
    min_on_hand: float | None,
    max_on_hand: float | None,
) -> tuple[float | None, float | None]:
    """Validate optional package-count limits; both may be null."""
    min_clean: float | None
    max_clean: float | None
    if min_on_hand is None:
        min_clean = None
    else:
        if not isinstance(min_on_hand, (int, float)) or min_on_hand < 0:
            raise ValueError("minOnHand must be zero or greater")
        min_clean = float(min_on_hand)
    if max_on_hand is None:
        max_clean = None
    else:
        if not isinstance(max_on_hand, (int, float)) or max_on_hand < 0:
            raise ValueError("maxOnHand must be zero or greater")
        max_clean = float(max_on_hand)
    if min_clean is not None and max_clean is not None and min_clean > max_clean:
        raise ValueError("minOnHand cannot be greater than maxOnHand")
    return min_clean, max_clean


def validate_catalog_fields(
    *,
    name: str,
    package_size: float,
    package_unit: str,
    storage_zone: str | InventoryStorageZone | None = None,
) -> tuple[str, float, str, str]:
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
    zone_clean = validate_storage_zone(storage_zone)
    return name_clean, float(package_size), unit_clean, zone_clean


def validate_on_hand(on_hand: float) -> float:
    if not isinstance(on_hand, (int, float)) or on_hand < 0:
        raise ValueError("onHand must be zero or greater")
    return float(on_hand)


def validate_movement_quantity(quantity: float) -> float:
    if not isinstance(quantity, (int, float)) or quantity <= 0:
        raise ValueError("quantity must be greater than 0")
    return float(quantity)


def validate_transfer_quantity(quantity: float, source_on_hand: float) -> float:
    qty = validate_movement_quantity(quantity)
    if qty > source_on_hand:
        raise ValueError("quantity cannot exceed current stock")
    return qty


def resolve_occurred_on(occurred_on: date | None) -> date:
    if occurred_on is None:
        return datetime.now(tz=UTC).date()
    return occurred_on


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


def add_movement(
    session: Session,
    *,
    location_id: int,
    catalog_item_id: int,
    stock_id: int | None,
    direction: str,
    quantity: float,
    occurred_on: date,
    related_movement_id: int | None = None,
    note: str | None = None,
) -> InventoryStockMovement:
    row = InventoryStockMovement(
        location_id=location_id,
        catalog_item_id=catalog_item_id,
        stock_id=stock_id,
        direction=direction,
        quantity=quantity,
        occurred_on=occurred_on,
        related_movement_id=related_movement_id,
        note=note,
    )
    session.add(row)
    return row
