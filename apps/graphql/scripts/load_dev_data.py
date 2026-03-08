"""Load dev data: Excel sales report + optional menu COGS into the GraphQL dev database."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from graphql.data_sources import (
    AnalyticsRun,
    Location,
    MenuItemCogs,
    OrderFact,
    SessionLocal,
    drop_db,
    init_db,
)
from graphql.reports import normalize_sales_report, persist_sales_report


ROOT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_EXCEL = ROOT_DIR / "reports" / "Sales_Recapitulation_Detail_Report_Jan-Mar_2025.xlsx"
DEFAULT_COGS = ROOT_DIR / "notebooks" / "data" / "menu_cogs.json"


def _load_cogs_by_menu(cogs_path: Path) -> dict[str, float]:
    """Load menu_cogs.json and return a dict menu -> cogs (first occurrence per menu)."""
    raw = json.loads(cogs_path.read_text())
    by_menu: dict[str, float] = {}
    for entry in raw:
        menu = entry.get("menu")
        if menu is not None and menu not in by_menu:
            by_menu[menu] = float(entry.get("cogs", 0))
    return by_menu


def main(excel_path: str, cogs_path: str | None) -> int:
    path = Path(excel_path)
    if not path.exists():
        print(f"ERROR: Excel file not found: {path}")
        return 1

    cogs_file: Path | None = None
    if cogs_path is not None:
        cogs_file = Path(cogs_path)
        if not cogs_file.exists():
            print(f"ERROR: COGS file not found: {cogs_file}")
            return 1

    drop_db()
    init_db()

    payload = path.read_bytes()
    normalized_rows, detected_pos = normalize_sales_report(payload)

    session = SessionLocal()
    try:
        location = Location(name="Dev (Jan-Mar 2025)", city="Jakarta", country="Indonesia")
        session.add(location)
        session.commit()
        session.refresh(location)

        period_start: datetime | None = None
        period_end: datetime | None = None
        if normalized_rows:
            times = [
                row.orderTime
                if isinstance(row.orderTime, datetime)
                else datetime.fromisoformat(str(row.orderTime))
                for row in normalized_rows
            ]
            period_start = min(times)
            period_end = max(times)

        analytics_run = AnalyticsRun(
            name=path.name,
            filename=path.name,
            pos_system=detected_pos,
            period_start=period_start.date() if period_start else None,
            period_end=period_end.date() if period_end else None,
            location_id=location.id,
        )
        session.add(analytics_run)
        session.commit()
        session.refresh(analytics_run)
        analytics_run_id = analytics_run.id
    finally:
        session.close()

    persist_sales_report(
        normalized_rows,
        detected_pos,
        analytics_run_id=analytics_run_id,
    )

    cogs_count = 0
    if cogs_file is not None and cogs_file.exists():
        cogs_by_menu = _load_cogs_by_menu(cogs_file)
        session = SessionLocal()
        try:
            order_facts = (
                session.query(OrderFact)
                .where(OrderFact.analytics_run_id == analytics_run_id)
                .all()
            )
            seen_menus: dict[str, tuple[str | None, str | None]] = {}
            for row in order_facts:
                if row.menu not in seen_menus:
                    seen_menus[row.menu] = (row.menu_category, row.menu_category_detail)
            for menu, (menu_category, menu_category_detail) in seen_menus.items():
                cogs = cogs_by_menu.get(menu, 0.0)
                session.add(
                    MenuItemCogs(
                        analytics_run_id=analytics_run_id,
                        menu=menu,
                        menu_category=menu_category,
                        menu_category_detail=menu_category_detail,
                        cogs=cogs,
                        currency="IDR",
                    )
                )
                cogs_count += 1
            session.commit()
        finally:
            session.close()
        print(f"Loaded {len(normalized_rows)} rows and {cogs_count} menu COGS from {path} and {cogs_file}.")
    else:
        if cogs_path is not None:
            print(f"COGS file not found; skipping. Loaded {len(normalized_rows)} rows from {path}.")
        else:
            print(f"Loaded {len(normalized_rows)} rows from {path}. (No COGS file provided; run with --cogs to add COGS.)")

    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Load dev data: Excel sales report and optional menu COGS into the GraphQL dev database."
    )
    parser.add_argument(
        "--excel",
        default=str(DEFAULT_EXCEL),
        help=f"Path to the Excel sales report (default: {DEFAULT_EXCEL})",
    )
    parser.add_argument(
        "--cogs",
        default=None,
        metavar="PATH",
        help=f"Path to menu_cogs.json (default: {DEFAULT_COGS}; omit to skip COGS)",
    )
    args = parser.parse_args()

    excel_path = args.excel
    cogs_path = args.cogs if args.cogs is not None else str(DEFAULT_COGS) if DEFAULT_COGS.exists() else None
    sys.exit(main(excel_path, cogs_path))
