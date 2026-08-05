"""Location COGS catalog: list, upsert, seed onto runs, promote from runs."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass

from sqlalchemy.orm import Session

from graphql.data_sources import Location, LocationMenuItemCogs, MenuItemCogs, OrderFact


@dataclass(frozen=True)
class LocationCogsUpsertItem:
    menu_name: str
    cogs: float
    menu_category: str | None = None
    menu_category_detail: str | None = None
    currency: str | None = None


def menu_key(name: str) -> str:
    """Normalize menu names for case-insensitive matching."""
    return name.strip().casefold()


def location_currency(session: Session, location_id: int) -> str:
    """Return the location's currency code, falling back to IDR."""
    loc = session.get(Location, location_id)
    raw = (loc.currency if loc else None) or "IDR"
    code = raw.strip().upper()
    return code or "IDR"


def list_location_cogs(session: Session, location_id: int) -> list[LocationMenuItemCogs]:
    return (
        session.query(LocationMenuItemCogs)
        .where(LocationMenuItemCogs.location_id == location_id)
        .order_by(LocationMenuItemCogs.menu)
        .all()
    )


def _catalog_by_key(session: Session, location_id: int) -> dict[str, LocationMenuItemCogs]:
    rows = list_location_cogs(session, location_id)
    return {menu_key(row.menu): row for row in rows}


def upsert_location_cogs_bulk(
    session: Session,
    location_id: int,
    items: Sequence[LocationCogsUpsertItem],
) -> list[LocationMenuItemCogs]:
    by_key = _catalog_by_key(session, location_id)
    default_currency = location_currency(session, location_id)
    touched: list[LocationMenuItemCogs] = []

    for item in items:
        name = item.menu_name.strip()
        if not name:
            continue
        key = menu_key(name)
        currency = (item.currency or default_currency).strip().upper() or default_currency
        row = by_key.get(key)
        if row is None:
            row = LocationMenuItemCogs(
                location_id=location_id,
                menu=name,
                menu_category=item.menu_category,
                menu_category_detail=item.menu_category_detail,
                cogs=item.cogs,
                currency=currency,
            )
            session.add(row)
            by_key[key] = row
        else:
            row.menu = name
            row.cogs = item.cogs
            row.currency = currency
            if item.menu_category is not None:
                row.menu_category = item.menu_category
            if item.menu_category_detail is not None:
                row.menu_category_detail = item.menu_category_detail
        touched.append(row)

    session.flush()
    return touched


def seed_run_cogs_from_location(
    session: Session,
    *,
    analytics_run_id: int,
    location_id: int,
    menus: Iterable[str],
) -> list[MenuItemCogs]:
    """
    Copy matching location catalog COGS onto a run snapshot.

    Canonical menu string on the run comes from the sales/menus argument.
    """
    catalog = _catalog_by_key(session, location_id)
    if not catalog:
        return []

    default_currency = location_currency(session, location_id)
    existing = (
        session.query(MenuItemCogs).where(MenuItemCogs.analytics_run_id == analytics_run_id).all()
    )
    by_key = {menu_key(row.menu): row for row in existing}
    touched: list[MenuItemCogs] = []

    seen: set[str] = set()
    for raw_menu in menus:
        name = raw_menu.strip()
        if not name:
            continue
        key = menu_key(name)
        if key in seen:
            continue
        seen.add(key)
        source = catalog.get(key)
        if source is None:
            continue

        currency = (source.currency or default_currency).strip().upper() or default_currency
        row = by_key.get(key)
        if row is None:
            row = MenuItemCogs(
                analytics_run_id=analytics_run_id,
                menu=name,
                menu_category=source.menu_category,
                menu_category_detail=source.menu_category_detail,
                cogs=float(source.cogs),
                currency=currency,
            )
            session.add(row)
            by_key[key] = row
        else:
            row.menu = name
            row.cogs = float(source.cogs)
            row.menu_category = source.menu_category
            row.menu_category_detail = source.menu_category_detail
            row.currency = currency
        touched.append(row)

    session.flush()
    return touched


def copy_run_cogs_to_location(
    session: Session,
    *,
    analytics_run_id: int,
    location_id: int,
) -> list[LocationMenuItemCogs]:
    """Promote run snapshot COGS into the location catalog."""
    run_rows = (
        session.query(MenuItemCogs).where(MenuItemCogs.analytics_run_id == analytics_run_id).all()
    )
    items = [
        LocationCogsUpsertItem(
            menu_name=row.menu,
            cogs=float(row.cogs),
            menu_category=row.menu_category,
            menu_category_detail=row.menu_category_detail,
            currency=row.currency,
        )
        for row in run_rows
    ]
    return upsert_location_cogs_bulk(session, location_id, items)


def apply_location_cogs_to_run(
    session: Session,
    *,
    analytics_run_id: int,
    location_id: int,
) -> list[MenuItemCogs]:
    """
    Refresh run snapshot from the location catalog for menus that appear in
    order facts or existing run COGS rows.
    """
    fact_menus = {
        row.menu
        for row in session.query(OrderFact.menu)
        .where(OrderFact.analytics_run_id == analytics_run_id)
        .distinct()
        .all()
    }
    existing_menus = {
        row.menu
        for row in session.query(MenuItemCogs.menu)
        .where(MenuItemCogs.analytics_run_id == analytics_run_id)
        .all()
    }
    menus = fact_menus | existing_menus
    return seed_run_cogs_from_location(
        session,
        analytics_run_id=analytics_run_id,
        location_id=location_id,
        menus=menus,
    )
