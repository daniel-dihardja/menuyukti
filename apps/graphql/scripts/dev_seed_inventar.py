"""Reset and seed inventar catalog/stock/movements for local dev."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
from graphql.data_sources.models.inventory_stock import InventoryStock
from graphql.data_sources.models.inventory_stock_movement import InventoryStockMovement
from graphql.data_sources.models.location import Location
from graphql.data_sources.models.workspace import Workspace

DIRECTION_IN = "in"
DIRECTION_OUT = "out"
DIRECTION_TRANSFER_IN = "transfer_in"
DIRECTION_TRANSFER_OUT = "transfer_out"

_ALLOWED_STORAGE_ZONES = frozenset({"freezer", "cooler", "dry"})

# Inclusive burn window used by inventoryRefillForecast default.
_FORECAST_WINDOW_DAYS = 14


@dataclass(frozen=True)
class _CatalogSeed:
    name: str
    package_size: float
    package_unit: str
    storage_zone: str
    price: float | None
    min_on_hand: float | None
    max_on_hand: float | None
    primary_on_hand: float
    branch_on_hand: float


_CATALOG_SEEDS: tuple[_CatalogSeed, ...] = (
    _CatalogSeed(
        name="Oat milk",
        package_size=1.0,
        package_unit="L",
        storage_zone="cooler",
        price=45000.0,
        min_on_hand=2.0,
        max_on_hand=12.0,
        # After 14×0.5 outs: ~2 days to min (urgent refill demo).
        primary_on_hand=3.0,
        branch_on_hand=2.0,
    ),
    _CatalogSeed(
        name="Espresso beans",
        package_size=1.0,
        package_unit="kg",
        storage_zone="dry",
        price=180000.0,
        min_on_hand=1.0,
        max_on_hand=8.0,
        # After 3×1.0 outs over 14d: ~2 weeks to min (medium).
        primary_on_hand=4.0,
        branch_on_hand=0.0,
    ),
    _CatalogSeed(
        name="Frozen berries",
        package_size=500.0,
        package_unit="g",
        storage_zone="freezer",
        price=65000.0,
        min_on_hand=1.0,
        max_on_hand=6.0,
        # At min with burn + transfer → top/urgent priority.
        primary_on_hand=1.0,
        branch_on_hand=1.0,
    ),
    _CatalogSeed(
        name="Dish soap",
        package_size=1.0,
        package_unit="L",
        storage_zone="dry",
        price=None,
        min_on_hand=None,
        max_on_hand=None,
        # Receive only → insufficient_history in forecast.
        primary_on_hand=2.0,
        branch_on_hand=1.0,
    ),
)


def reset_inventar(session: Session, workspace_id: int) -> None:
    """Delete inventar rows for all locations in the workspace (FK-safe order)."""
    location_ids = [
        loc_id
        for (loc_id,) in session.query(Location.id)
        .filter(Location.workspace_id == workspace_id)
        .all()
    ]
    if location_ids:
        session.query(InventoryStockMovement).filter(
            InventoryStockMovement.location_id.in_(location_ids)
        ).delete(synchronize_session=False)
        session.query(InventoryStock).filter(InventoryStock.location_id.in_(location_ids)).delete(
            synchronize_session=False
        )
    session.query(InventoryCatalogItem).filter(
        InventoryCatalogItem.workspace_id == workspace_id
    ).delete(synchronize_session=False)
    session.flush()
    # query.delete() leaves no expired rows; clear identity map so reseeds can reuse PKs on SQLite.
    session.expunge_all()


def seed_inventar(
    session: Session,
    workspace: Workspace,
    primary_location: Location,
    branch_location: Location,
) -> dict[str, int]:
    """
    Insert a small pantry catalog, stock at primary + branch, and sample movements.

    Primary location includes ~14 days of outs so inventoryRefillForecast demos
    clear refill priority (oat milk urgent, beans medium, berries at min, soap no history).

    Returns counts: catalog_items, stock_rows, movements.
    """
    today = datetime.now(tz=UTC).date()
    receive_day = today - timedelta(days=_FORECAST_WINDOW_DAYS)

    workspace = session.merge(workspace)
    primary_location = session.merge(primary_location)
    branch_location = session.merge(branch_location)

    catalog_count = 0
    stock_count = 0
    movement_count = 0

    for item in _CATALOG_SEEDS:
        name, size, unit, zone = _validate_catalog_fields(
            name=item.name,
            package_size=item.package_size,
            package_unit=item.package_unit,
            storage_zone=item.storage_zone,
        )
        price = _validate_price(item.price)
        min_on_hand, max_on_hand = _validate_limits(item.min_on_hand, item.max_on_hand)
        catalog = InventoryCatalogItem(
            workspace_id=workspace.id,
            name=name,
            package_size=size,
            package_unit=unit,
            storage_zone=zone,
            price=price,
            min_on_hand=min_on_hand,
            max_on_hand=max_on_hand,
        )
        session.add(catalog)
        session.flush()
        catalog_count += 1

        primary_burn = _primary_burn_total(item.name)
        transfer_qty = 1.0 if item.name == "Frozen berries" else 0.0
        primary_received = item.primary_on_hand + primary_burn + transfer_qty

        primary_stock = _ensure_stock(
            session,
            location_id=primary_location.id,
            catalog_item_id=catalog.id,
            on_hand=0.0,
        )
        stock_count += 1
        movement_count += _receive(
            session,
            stock=primary_stock,
            quantity=primary_received,
            occurred_on=receive_day,
            note="Dev seed receive",
        )

        movement_count += _seed_primary_burn(
            session,
            stock=primary_stock,
            item_name=item.name,
            today=today,
        )

        if item.name == "Frozen berries":
            branch_stock = _ensure_stock(
                session,
                location_id=branch_location.id,
                catalog_item_id=catalog.id,
                on_hand=0.0,
            )
            stock_count += 1
            movement_count += _transfer(
                session,
                source=primary_stock,
                dest=branch_stock,
                quantity=transfer_qty,
                occurred_on=today - timedelta(days=1),
                note="Dev seed transfer",
            )
        elif item.branch_on_hand > 0:
            branch_stock = _ensure_stock(
                session,
                location_id=branch_location.id,
                catalog_item_id=catalog.id,
                on_hand=0.0,
            )
            stock_count += 1
            movement_count += _receive(
                session,
                stock=branch_stock,
                quantity=item.branch_on_hand,
                occurred_on=receive_day,
                note="Dev seed receive (branch)",
            )

        primary_stock.on_hand = _validate_on_hand(item.primary_on_hand)
        if item.branch_on_hand > 0 or item.name == "Frozen berries":
            branch_row = (
                session.query(InventoryStock)
                .filter(
                    InventoryStock.location_id == branch_location.id,
                    InventoryStock.catalog_item_id == catalog.id,
                )
                .one()
            )
            branch_row.on_hand = _validate_on_hand(item.branch_on_hand)

    session.flush()
    return {
        "catalog_items": catalog_count,
        "stock_rows": stock_count,
        "movements": movement_count,
    }


def _primary_burn_total(item_name: str) -> float:
    if item_name == "Oat milk":
        return 0.5 * float(_FORECAST_WINDOW_DAYS)
    if item_name == "Espresso beans":
        return 3.0
    if item_name == "Frozen berries":
        return 1.0  # outs only; transfer counted separately
    return 0.0


def _seed_primary_burn(
    session: Session,
    *,
    stock: InventoryStock,
    item_name: str,
    today: date,
) -> int:
    """Write ~14d of primary outs for forecast demos. Returns movement count."""
    count = 0
    if item_name == "Oat milk":
        for offset in range(_FORECAST_WINDOW_DAYS):
            count += _consume(
                session,
                stock=stock,
                quantity=0.5,
                occurred_on=today - timedelta(days=offset),
                note="Dev seed use",
            )
    elif item_name == "Espresso beans":
        for offset in (0, 5, 10):
            count += _consume(
                session,
                stock=stock,
                quantity=1.0,
                occurred_on=today - timedelta(days=offset),
                note="Dev seed use",
            )
    elif item_name == "Frozen berries":
        for offset in (2, 6, 11, 13):
            count += _consume(
                session,
                stock=stock,
                quantity=0.25,
                occurred_on=today - timedelta(days=offset),
                note="Dev seed use",
            )
    return count


def _validate_catalog_fields(
    *,
    name: str,
    package_size: float,
    package_unit: str,
    storage_zone: str,
) -> tuple[str, float, str, str]:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Name cannot be empty")
    if package_size <= 0:
        raise ValueError("packageSize must be greater than 0")
    unit_clean = package_unit.strip()
    if not unit_clean:
        raise ValueError("packageUnit cannot be empty")
    zone_clean = storage_zone.strip().lower()
    if zone_clean not in _ALLOWED_STORAGE_ZONES:
        raise ValueError("storageZone must be freezer, cooler, or dry")
    return name_clean, float(package_size), unit_clean, zone_clean


def _validate_price(price: float | None) -> float | None:
    if price is None:
        return None
    if price < 0:
        raise ValueError("price must be zero or greater")
    return float(price)


def _validate_limits(
    min_on_hand: float | None,
    max_on_hand: float | None,
) -> tuple[float | None, float | None]:
    min_clean = None if min_on_hand is None else float(min_on_hand)
    max_clean = None if max_on_hand is None else float(max_on_hand)
    if min_clean is not None and min_clean < 0:
        raise ValueError("minOnHand must be zero or greater")
    if max_clean is not None and max_clean < 0:
        raise ValueError("maxOnHand must be zero or greater")
    if min_clean is not None and max_clean is not None and min_clean > max_clean:
        raise ValueError("minOnHand cannot be greater than maxOnHand")
    return min_clean, max_clean


def _validate_on_hand(on_hand: float) -> float:
    if on_hand < 0:
        raise ValueError("onHand must be zero or greater")
    return float(on_hand)


def _ensure_stock(
    session: Session,
    *,
    location_id: int,
    catalog_item_id: int,
    on_hand: float,
) -> InventoryStock:
    row = InventoryStock(
        location_id=location_id,
        catalog_item_id=catalog_item_id,
        on_hand=_validate_on_hand(on_hand),
    )
    session.add(row)
    session.flush()
    return row


def _add_movement(
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


def _receive(
    session: Session,
    *,
    stock: InventoryStock,
    quantity: float,
    occurred_on: date,
    note: str,
) -> int:
    stock.on_hand = _validate_on_hand(stock.on_hand + quantity)
    stock.last_in_on = occurred_on
    _add_movement(
        session,
        location_id=stock.location_id,
        catalog_item_id=stock.catalog_item_id,
        stock_id=stock.id,
        direction=DIRECTION_IN,
        quantity=quantity,
        occurred_on=occurred_on,
        note=note,
    )
    return 1


def _consume(
    session: Session,
    *,
    stock: InventoryStock,
    quantity: float,
    occurred_on: date,
    note: str,
) -> int:
    stock.on_hand = _validate_on_hand(stock.on_hand - quantity)
    stock.last_out_on = occurred_on
    _add_movement(
        session,
        location_id=stock.location_id,
        catalog_item_id=stock.catalog_item_id,
        stock_id=stock.id,
        direction=DIRECTION_OUT,
        quantity=quantity,
        occurred_on=occurred_on,
        note=note,
    )
    return 1


def _transfer(
    session: Session,
    *,
    source: InventoryStock,
    dest: InventoryStock,
    quantity: float,
    occurred_on: date,
    note: str,
) -> int:
    source.on_hand = _validate_on_hand(source.on_hand - quantity)
    source.last_out_on = occurred_on
    dest.on_hand = _validate_on_hand(dest.on_hand + quantity)
    dest.last_in_on = occurred_on
    out_row = _add_movement(
        session,
        location_id=source.location_id,
        catalog_item_id=source.catalog_item_id,
        stock_id=source.id,
        direction=DIRECTION_TRANSFER_OUT,
        quantity=quantity,
        occurred_on=occurred_on,
        note=note,
    )
    session.flush()
    _add_movement(
        session,
        location_id=dest.location_id,
        catalog_item_id=dest.catalog_item_id,
        stock_id=dest.id,
        direction=DIRECTION_TRANSFER_IN,
        quantity=quantity,
        occurred_on=occurred_on,
        related_movement_id=out_row.id,
        note=note,
    )
    return 2
