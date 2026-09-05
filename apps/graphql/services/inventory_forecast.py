"""Deterministic inventar refill forecast from stock + movement burn rate."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload

from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
from graphql.data_sources.models.inventory_stock import InventoryStock
from graphql.data_sources.models.inventory_stock_movement import InventoryStockMovement
from graphql.services.inventory import DIRECTION_OUT, DIRECTION_TRANSFER_OUT

DEFAULT_WINDOW_DAYS = 14
MIN_WINDOW_DAYS = 7
MAX_WINDOW_DAYS = 90

CONFIDENCE_OK = "ok"
CONFIDENCE_INSUFFICIENT_HISTORY = "insufficient_history"

_BURN_DIRECTIONS = (DIRECTION_OUT, DIRECTION_TRANSFER_OUT)


@dataclass(frozen=True)
class InventoryRefillForecastRow:
    catalog_item_id: int
    name: str
    storage_zone: str
    on_hand: float
    min_on_hand: float | None
    avg_daily_out: float
    days_until_refill: float | None
    priority_rank: int
    confidence: str
    window_days: int


def clamp_window_days(window_days: int | None) -> int:
    if window_days is None:
        return DEFAULT_WINDOW_DAYS
    return max(MIN_WINDOW_DAYS, min(int(window_days), MAX_WINDOW_DAYS))


def compute_inventory_refill_forecast(
    session: Session,
    *,
    location_id: int,
    window_days: int | None = None,
    as_of: date | None = None,
) -> list[InventoryRefillForecastRow]:
    """Rank catalog stock at a location by days until refill target.

    Burn = sum(out + transfer_out) over the inclusive window ending ``as_of``,
    divided by ``window_days``. Target is ``min_on_hand`` when set, else 0.
    """
    days = clamp_window_days(window_days)
    end = as_of if as_of is not None else datetime.now(tz=UTC).date()
    start = end - timedelta(days=days - 1)

    stock_rows = (
        session.scalars(
            select(InventoryStock)
            .join(
                InventoryCatalogItem,
                InventoryStock.catalog_item_id == InventoryCatalogItem.id,
            )
            .options(joinedload(InventoryStock.catalog_item))
            .where(InventoryStock.location_id == location_id)
            .order_by(
                InventoryCatalogItem.name.asc(),
                InventoryCatalogItem.package_size.asc(),
            )
        )
        .unique()
        .all()
    )
    if not stock_rows:
        return []

    catalog_ids = [row.catalog_item_id for row in stock_rows]
    burn_by_catalog = _aggregate_burn_by_catalog(
        session,
        location_id=location_id,
        catalog_ids=catalog_ids,
        start=start,
        end=end,
    )

    drafted: list[tuple[float | None, bool, InventoryRefillForecastRow]] = []
    for stock in stock_rows:
        catalog = stock.catalog_item
        total_out = burn_by_catalog.get(stock.catalog_item_id, 0.0)
        avg_daily_out = total_out / float(days)
        target = catalog.min_on_hand if catalog.min_on_hand is not None else 0.0
        below_or_at_min = stock.on_hand <= target

        if avg_daily_out <= 0.0:
            days_until: float | None = None
            confidence = CONFIDENCE_INSUFFICIENT_HISTORY
        elif below_or_at_min:
            days_until = 0.0
            confidence = CONFIDENCE_OK
        else:
            days_until = (stock.on_hand - target) / avg_daily_out
            confidence = CONFIDENCE_OK

        drafted.append(
            (
                days_until,
                below_or_at_min,
                InventoryRefillForecastRow(
                    catalog_item_id=stock.catalog_item_id,
                    name=catalog.name,
                    storage_zone=catalog.storage_zone,
                    on_hand=stock.on_hand,
                    min_on_hand=catalog.min_on_hand,
                    avg_daily_out=avg_daily_out,
                    days_until_refill=days_until,
                    priority_rank=0,
                    confidence=confidence,
                    window_days=days,
                ),
            )
        )

    # Ascending days (nulls last), then already-below-min first among ties.
    drafted.sort(
        key=lambda item: (
            item[0] is None,
            item[0] if item[0] is not None else 0.0,
            not item[1],
            item[2].name.lower(),
        )
    )

    return [
        InventoryRefillForecastRow(
            catalog_item_id=row.catalog_item_id,
            name=row.name,
            storage_zone=row.storage_zone,
            on_hand=row.on_hand,
            min_on_hand=row.min_on_hand,
            avg_daily_out=row.avg_daily_out,
            days_until_refill=row.days_until_refill,
            priority_rank=index,
            confidence=row.confidence,
            window_days=row.window_days,
        )
        for index, (_days, _below, row) in enumerate(drafted, start=1)
    ]


def _aggregate_burn_by_catalog(
    session: Session,
    *,
    location_id: int,
    catalog_ids: list[int],
    start: date,
    end: date,
) -> dict[int, float]:
    stmt: Select[tuple[int, float]] = (
        select(
            InventoryStockMovement.catalog_item_id,
            func.coalesce(func.sum(InventoryStockMovement.quantity), 0.0),
        )
        .where(
            InventoryStockMovement.location_id == location_id,
            InventoryStockMovement.catalog_item_id.in_(catalog_ids),
            InventoryStockMovement.direction.in_(_BURN_DIRECTIONS),
            InventoryStockMovement.occurred_on >= start,
            InventoryStockMovement.occurred_on <= end,
        )
        .group_by(InventoryStockMovement.catalog_item_id)
    )
    return {int(catalog_id): float(total) for catalog_id, total in session.execute(stmt).all()}
