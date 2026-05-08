"""Load dev data: Excel sales report + optional menu COGS into the GraphQL dev database."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import UTC, datetime, time
from pathlib import Path

from graphql.data_sources import (
    AnalyticsRun,
    ApiAdapterTool,
    Location,
    LocationManualBriefInput,
    LocationOpeningHour,
    MenuItemCogs,
    OrderFact,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
    drop_db,
    init_db,
)
from graphql.reports import normalize_sales_report, persist_sales_report
from graphql.services.api_adapter_tool import (
    normalize_description,
    normalize_name,
    tool_key_from_name,
    validate_tool_url,
)
from graphql.services.manual_quick_profile import validate_and_normalize_quick_profile

ROOT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_EXCEL = ROOT_DIR / "reports" / "Sales_Recapitulation_Detail_Report_Jan-Mar_2025.xlsx"
DEFAULT_COGS = ROOT_DIR / "notebooks" / "data" / "menu_cogs.json"

# Must match the Clerk user id used by the web app (X-User-Id) so resolvers allow access.
_DEFAULT_DEV_CLERK_USER_ID = "dev_local_user"

# Seeded API proxy (API adapter tool) for milestone-run mock promotions; override URL if mock-server differs.
_DEFAULT_DEV_MOCK_PROMOTIONS_URL = "http://127.0.0.1:3090/api/mock"
_DEV_PROMO_TOOL_NAME = "Menu Promotions Mock API"


def _resolve_clerk_user_id(cli_value: str | None) -> str:
    if cli_value:
        return cli_value
    return os.environ.get("DEV_CLERK_USER_ID", _DEFAULT_DEV_CLERK_USER_ID)


def _load_cogs_by_menu(cogs_path: Path) -> dict[str, float]:
    """Load menu_cogs.json and return a dict menu -> cogs (first occurrence per menu)."""
    raw = json.loads(cogs_path.read_text())
    by_menu: dict[str, float] = {}
    for entry in raw:
        menu = entry.get("menu")
        if menu is not None and menu not in by_menu:
            by_menu[menu] = float(entry.get("cogs", 0))
    return by_menu


def main(excel_path: str, cogs_path: str | None, clerk_user_id: str) -> int:
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

    mock_promotions_url = os.environ.get(
        "DEV_MOCK_PROMOTIONS_URL",
        _DEFAULT_DEV_MOCK_PROMOTIONS_URL,
    )

    drop_db()
    init_db()

    payload = path.read_bytes()
    normalized_rows, detected_pos = normalize_sales_report(payload)

    session = SessionLocal()
    try:
        now = datetime.now(tz=UTC)
        workspace = Workspace(
            name="Dev Workspace",
            owner_clerk_user_id=clerk_user_id,
        )
        session.add(workspace)
        session.flush()
        session.add(
            WorkspaceMembership(
                workspace_id=workspace.id,
                clerk_user_id=clerk_user_id,
                role="owner",
                invited_at=now,
                accepted_at=now,
            )
        )
        session.flush()

        promo_name = normalize_name(_DEV_PROMO_TOOL_NAME)
        session.add(
            ApiAdapterTool(
                workspace_id=workspace.id,
                tool_key=tool_key_from_name(promo_name),
                name=promo_name,
                description=normalize_description(
                    "HTTP GET to the mock promotions JSON feed (dev). Run apps/mock-server; "
                    "set MENUYUKTI_ADAPTER_DEV_HTTP_LOCALHOST=1 on agents. "
                    "tool_key menu_promotions_mock_api matches the custom-api-tool-mock-demo workflow preset."
                ),
                url=validate_tool_url(mock_promotions_url),
                is_active=True,
            )
        )
        session.flush()

        location = Location(
            name="SNABB",
            city="Jakarta",
            country="Indonesia",
            currency="IDR",
            workspace_id=workspace.id,
            clerk_user_id=clerk_user_id,
        )
        session.add(location)
        session.flush()

        # Mon–Fri 08:00–18:00; weekend rows omitted (UI treats missing days as closed).
        for day in ("monday", "tuesday", "wednesday", "thursday", "friday"):
            session.add(
                LocationOpeningHour(
                    location_id=location.id,
                    day_of_week=day,
                    open_time=time(hour=8, minute=0),
                    close_time=time(hour=18, minute=0),
                )
            )

        # Sample owner manual brief hints (separate from AI location_social_settings) for local UI / agents.
        session.add(
            LocationManualBriefInput(
                location_id=location.id,
                quick_profile=validate_and_normalize_quick_profile(
                    {
                        "venueConcepts": ["cafe", "bistro"],
                        "socialGoals": ["awareness"],
                        "guestTags": ["families"],
                        "locationFocus": ["breakfast", "lunch"],
                        "tonePresets": ["warm"],
                        "videoComfort": True,
                    }
                ),
            )
        )

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
        persist_sales_report(
            session,
            normalized_rows,
            detected_pos,
            analytics_run_id=analytics_run_id,
        )
    finally:
        session.close()

    cogs_count = 0
    if cogs_file is not None and cogs_file.exists():
        cogs_by_menu = _load_cogs_by_menu(cogs_file)
        session = SessionLocal()
        try:
            order_facts = (
                session.query(OrderFact).where(OrderFact.analytics_run_id == analytics_run_id).all()
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
        print(
            f"Loaded {len(normalized_rows)} rows and {cogs_count} menu COGS from {path} and {cogs_file}."
        )
    else:
        if cogs_path is not None:
            print(f"COGS file not found; skipping. Loaded {len(normalized_rows)} rows from {path}.")
        else:
            print(
                f"Loaded {len(normalized_rows)} rows from {path}. (No COGS file provided; run with --cogs to add COGS.)"
            )

    print(
        f"Workspace owner clerk_user_id={clerk_user_id!r}. "
        "Set DEV_CLERK_USER_ID or --clerk-user-id to your Clerk user id so the web app can query this data."
    )
    print(
        f"Seeded API adapter tool {_DEV_PROMO_TOOL_NAME!r} "
        f"(tool_key menu_promotions_mock_api) → {mock_promotions_url!r}. "
        "Override with DEV_MOCK_PROMOTIONS_URL if needed."
    )
    if clerk_user_id == _DEFAULT_DEV_CLERK_USER_ID and not os.environ.get("DEV_CLERK_USER_ID"):
        print(
            "Hint: export DEV_CLERK_USER_ID=<your Clerk user id> before make dev-data, "
            "or pass --clerk-user-id, to match the signed-in user in the UI."
        )

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
    parser.add_argument(
        "--clerk-user-id",
        default=None,
        metavar="ID",
        help=(
            "Clerk user id for Workspace owner and Location (default: DEV_CLERK_USER_ID env or "
            f"{_DEFAULT_DEV_CLERK_USER_ID!r})"
        ),
    )
    args = parser.parse_args()

    excel_path = args.excel
    cogs_path = (
        args.cogs if args.cogs is not None else str(DEFAULT_COGS) if DEFAULT_COGS.exists() else None
    )
    clerk_user_id = _resolve_clerk_user_id(args.clerk_user_id)
    sys.exit(main(excel_path, cogs_path, clerk_user_id))
