"""Location area create/update/delete helpers."""

from __future__ import annotations

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from graphql.data_sources.models.inventory_stock_movement import InventoryStockMovement
from graphql.data_sources.models.location_area import LocationArea

_MAX_AREA_NAME_LEN = 128


def normalize_area_name(name: str) -> str:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Area name cannot be empty")
    if len(name_clean) > _MAX_AREA_NAME_LEN:
        raise ValueError("Area name is too long")
    return name_clean


def normalize_area_sort_order(sort_order: int | None) -> int:
    if sort_order is None:
        return 0
    if not isinstance(sort_order, int):
        raise ValueError("sortOrder must be an integer")
    return sort_order


def next_area_sort_order(session: Session, location_id: int) -> int:
    current_max = session.scalar(
        select(func.max(LocationArea.sort_order)).where(LocationArea.location_id == location_id)
    )
    return int(current_max) + 1 if current_max is not None else 0


def get_location_area_or_raise(session: Session, area_id: int) -> LocationArea:
    row = session.get(LocationArea, area_id)
    if row is None:
        raise ValueError("Area not found")
    return row


def assert_area_belongs_to_location(
    session: Session,
    *,
    area_id: int,
    location_id: int,
) -> LocationArea:
    row = get_location_area_or_raise(session, area_id)
    if row.location_id != location_id:
        raise ValueError("Area does not belong to this location")
    return row


def create_location_area(
    session: Session,
    *,
    location_id: int,
    name: str,
    sort_order: int | None = None,
) -> LocationArea:
    name_clean = normalize_area_name(name)
    order = (
        normalize_area_sort_order(sort_order)
        if sort_order is not None
        else next_area_sort_order(session, location_id)
    )
    existing = session.scalar(
        select(LocationArea).where(
            LocationArea.location_id == location_id,
            LocationArea.name == name_clean,
        )
    )
    if existing is not None:
        raise ValueError("An area with this name already exists at this location")
    row = LocationArea(
        location_id=location_id,
        name=name_clean,
        sort_order=order,
    )
    session.add(row)
    session.flush()
    return row


def update_location_area(
    session: Session,
    area: LocationArea,
    *,
    name: str | None = None,
    sort_order: int | None = None,
) -> LocationArea:
    if name is not None:
        name_clean = normalize_area_name(name)
        if name_clean != area.name:
            conflict = session.scalar(
                select(LocationArea).where(
                    LocationArea.location_id == area.location_id,
                    LocationArea.name == name_clean,
                    LocationArea.id != area.id,
                )
            )
            if conflict is not None:
                raise ValueError("An area with this name already exists at this location")
            area.name = name_clean
    if sort_order is not None:
        area.sort_order = normalize_area_sort_order(sort_order)
    session.flush()
    return area


def delete_location_area(session: Session, area: LocationArea) -> None:
    # Explicit null so history survives even when the DB does not enforce ON DELETE SET NULL
    # (e.g. SQLite tests without PRAGMA foreign_keys).
    session.execute(
        update(InventoryStockMovement)
        .where(InventoryStockMovement.location_area_id == area.id)
        .values(location_area_id=None)
    )
    session.delete(area)
    session.flush()
