"""Batch-import paid Menuyukti POS tickets into a new AnalyticsRun snapshot."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import insert, select
from sqlalchemy.orm import Session, selectinload

from graphql.access import require_location_owner
from graphql.data_sources import AnalyticsRun, Location, OrderFact
from graphql.data_sources.models.pos_order import PosOrder, PosOrderLine
from graphql.services.location_cogs import seed_run_cogs_from_location
from graphql.services.pos_orders import (
    POS_STATUS_PAID,
    POS_SYSTEM,
    allocate_line_revenues,
)


@dataclass(frozen=True)
class PosSalesImportResult:
    analytics_run_id: int
    name: str
    order_count: int
    line_count: int


def _utc_day_window(start_date: date, end_date: date) -> tuple[datetime, datetime]:
    """Inclusive calendar dates as half-open UTC bounds ``[start, end+1day)``."""
    start_dt = datetime.combine(start_date, datetime.min.time(), tzinfo=UTC)
    end_exclusive = datetime.combine(end_date + timedelta(days=1), datetime.min.time(), tzinfo=UTC)
    return start_dt, end_exclusive


def ingest_pos_sales_range(
    session: Session,
    *,
    location_id: int,
    user_id: str,
    start_date: date,
    end_date: date,
) -> PosSalesImportResult:
    """Create a new analytics run from paid POS tickets in ``[start_date, end_date]`` (UTC).

    Always creates a new run (duplicates allowed). Does not merge into monthly live-projection runs.
    """
    if start_date > end_date:
        raise ValueError("startDate must be on or before endDate")

    loc = session.get(Location, int(location_id))
    if loc is None:
        raise ValueError(f"Location {location_id} not found")
    require_location_owner(session, int(location_id), user_id)

    start_dt, end_exclusive = _utc_day_window(start_date, end_date)
    orders = list(
        session.execute(
            select(PosOrder)
            .options(selectinload(PosOrder.lines).selectinload(PosOrderLine.modifiers))
            .where(
                PosOrder.location_id == int(location_id),
                PosOrder.status == POS_STATUS_PAID,
                PosOrder.closed_at.is_not(None),
                PosOrder.closed_at >= start_dt,
                PosOrder.closed_at < end_exclusive,
            )
            .order_by(PosOrder.closed_at.asc(), PosOrder.id.asc())
        )
        .unique()
        .scalars()
        .all()
    )
    if not orders:
        raise ValueError("No paid POS tickets found in the selected date range")

    run_name = f"Menuyukti POS {start_date.isoformat()}–{end_date.isoformat()}"
    analytics_run = AnalyticsRun(
        name=run_name,
        filename="",
        pos_system=POS_SYSTEM,
        period_start=start_date,
        period_end=end_date,
        location_id=loc.id,
    )
    session.add(analytics_run)
    session.flush()

    mappings: list[dict[str, object]] = []
    menus: set[str] = set()
    for order in orders:
        if not order.lines:
            continue
        closed_at = order.closed_at
        if closed_at is None:
            continue
        if closed_at.tzinfo is None:
            closed_at = closed_at.replace(tzinfo=UTC)
        revenues = allocate_line_revenues(order.lines, order.discount_amount)
        for line, revenue in zip(order.lines, revenues, strict=True):
            menus.add(line.name_snapshot)
            mappings.append(
                {
                    "analytics_run_id": analytics_run.id,
                    "bill_number": order.bill_number,
                    "menu": line.name_snapshot,
                    "qty": line.qty,
                    "price": float(line.unit_price),
                    "total_after_bill_discount": revenue,
                    "order_time": closed_at,
                    "menu_category": line.menu_category_snapshot,
                    "menu_category_detail": line.menu_category_detail_snapshot,
                    "pos_system": POS_SYSTEM,
                }
            )

    if not mappings:
        raise ValueError("No paid POS tickets with line items found in the selected date range")

    session.execute(insert(OrderFact), mappings)
    seed_run_cogs_from_location(
        session,
        analytics_run_id=analytics_run.id,
        location_id=loc.id,
        menus=menus,
    )
    session.flush()

    return PosSalesImportResult(
        analytics_run_id=analytics_run.id,
        name=analytics_run.name,
        order_count=len(orders),
        line_count=len(mappings),
    )
