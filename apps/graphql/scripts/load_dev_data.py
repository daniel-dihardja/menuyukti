"""Selective local seed: inventar (default) and optional analytics for a Clerk user."""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import UTC, datetime, time
from pathlib import Path

from sqlalchemy import or_
from sqlalchemy.orm import Session

from graphql.data_sources import (
    AnalyticsRun,
    Location,
    LocationManualBriefInput,
    LocationOpeningHour,
    MenuItemCogs,
    OrderFact,
    SessionLocal,
    Workspace,
    WorkspaceMembership,
)
from graphql.reports import normalize_sales_report, persist_sales_report
from graphql.scripts.dev_seed_inventar import reset_inventar, seed_inventar
from graphql.services.location_cogs import (
    LocationCogsUpsertItem,
    seed_run_cogs_from_location,
    upsert_location_cogs_bulk,
)
from graphql.services.manual_quick_profile import validate_and_normalize_quick_profile

ROOT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_EXCEL = ROOT_DIR / "reports" / "SalesRecapitulationDetailReport_JUN_2026.xlsx"
DEFAULT_COGS = ROOT_DIR / "notebooks" / "data" / "menu_cogs.json"

DEV_SEED_PREFIX = "dev-seed-"
PRIMARY_LOCATION_NAME = "SNABB"
BRANCH_LOCATION_NAME = "SNABB Branch"
DEV_WORKSPACE_NAME = "Dev Workspace"

SCOPES = ("inventar", "analytics", "all")


@dataclass(frozen=True)
class WorkspaceContext:
    workspace: Workspace
    primary_location: Location
    branch_location: Location
    created_primary: bool


def _resolve_clerk_user_id(cli_value: str | None) -> str:
    if cli_value and cli_value.strip():
        return cli_value.strip()
    env_value = os.environ.get("DEV_CLERK_USER_ID", "").strip()
    if env_value:
        return env_value
    raise SystemExit(
        "ERROR: Clerk user id required. Pass --clerk-user-id, set USER_ID on make, "
        "or export DEV_CLERK_USER_ID to match the signed-in web user."
    )


def _load_cogs_by_menu(cogs_path: Path) -> dict[str, float]:
    """Load menu_cogs.json and return a dict menu -> cogs (first occurrence per menu)."""
    raw = json.loads(cogs_path.read_text())
    by_menu: dict[str, float] = {}
    for entry in raw:
        menu = entry.get("menu")
        if menu is not None and menu not in by_menu:
            by_menu[menu] = float(entry.get("cogs", 0))
    return by_menu


def _add_default_opening_hours(session: Session, location_id: int) -> None:
    for day in ("monday", "tuesday", "wednesday", "thursday", "friday"):
        session.add(
            LocationOpeningHour(
                location_id=location_id,
                day_of_week=day,
                open_time=time(hour=8, minute=0),
                close_time=time(hour=18, minute=0),
            )
        )


def _add_sample_manual_brief(session: Session, location_id: int) -> None:
    session.add(
        LocationManualBriefInput(
            location_id=location_id,
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


def ensure_workspace_context(session: Session, clerk_user_id: str) -> WorkspaceContext:
    """Find or create workspace + primary location; always ensure inventar branch location."""
    now = datetime.now(tz=UTC)

    workspace = (
        session.query(Workspace)
        .filter(Workspace.owner_clerk_user_id == clerk_user_id)
        .order_by(Workspace.id.asc())
        .first()
    )
    if workspace is None:
        membership = (
            session.query(WorkspaceMembership)
            .filter(
                WorkspaceMembership.clerk_user_id == clerk_user_id,
                WorkspaceMembership.accepted_at.is_not(None),
            )
            .order_by(WorkspaceMembership.id.asc())
            .first()
        )
        if membership is not None:
            workspace = session.get(Workspace, membership.workspace_id)

    created_primary = False
    if workspace is None:
        workspace = Workspace(name=DEV_WORKSPACE_NAME, owner_clerk_user_id=clerk_user_id)
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

    membership = (
        session.query(WorkspaceMembership)
        .filter(
            WorkspaceMembership.workspace_id == workspace.id,
            WorkspaceMembership.clerk_user_id == clerk_user_id,
        )
        .first()
    )
    if membership is None:
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

    primary = (
        session.query(Location)
        .filter(
            Location.workspace_id == workspace.id,
            Location.name == PRIMARY_LOCATION_NAME,
        )
        .first()
    )
    if primary is None:
        primary = (
            session.query(Location)
            .filter(Location.workspace_id == workspace.id)
            .order_by(Location.id.asc())
            .first()
        )
    if primary is None:
        primary = Location(
            name=PRIMARY_LOCATION_NAME,
            city="Jakarta",
            country="Indonesia",
            currency="IDR",
            workspace_id=workspace.id,
            clerk_user_id=clerk_user_id,
        )
        session.add(primary)
        session.flush()
        _add_default_opening_hours(session, primary.id)
        _add_sample_manual_brief(session, primary.id)
        created_primary = True
    else:
        if not primary.clerk_user_id:
            primary.clerk_user_id = clerk_user_id

    branch = (
        session.query(Location)
        .filter(
            Location.workspace_id == workspace.id,
            Location.name == BRANCH_LOCATION_NAME,
        )
        .first()
    )
    if branch is None:
        branch = Location(
            name=BRANCH_LOCATION_NAME,
            city="Jakarta",
            country="Indonesia",
            currency="IDR",
            workspace_id=workspace.id,
            clerk_user_id=clerk_user_id,
        )
        session.add(branch)
        session.flush()
        _add_default_opening_hours(session, branch.id)

    session.flush()
    return WorkspaceContext(
        workspace=workspace,
        primary_location=primary,
        branch_location=branch,
        created_primary=created_primary,
    )


def _delete_dev_seed_analytics_runs(session: Session, location_id: int) -> int:
    runs = (
        session.query(AnalyticsRun)
        .filter(
            AnalyticsRun.location_id == location_id,
            or_(
                AnalyticsRun.filename.startswith(DEV_SEED_PREFIX),
                AnalyticsRun.name.startswith(DEV_SEED_PREFIX),
            ),
        )
        .all()
    )
    run_ids = [run.id for run in runs]
    if not run_ids:
        return 0
    session.query(MenuItemCogs).filter(MenuItemCogs.analytics_run_id.in_(run_ids)).delete(
        synchronize_session=False
    )
    session.query(OrderFact).filter(OrderFact.analytics_run_id.in_(run_ids)).delete(
        synchronize_session=False
    )
    session.query(AnalyticsRun).filter(AnalyticsRun.id.in_(run_ids)).delete(
        synchronize_session=False
    )
    session.flush()
    return len(run_ids)


def seed_analytics(
    session: Session,
    *,
    location: Location,
    excel_path: Path,
    cogs_path: Path | None,
) -> dict[str, int | str]:
    if not excel_path.exists():
        raise SystemExit(
            f"ERROR: Excel file not found: {excel_path}. "
            "Pass --excel / EXCEL= for SCOPE=analytics|all "
            "(reports/ is gitignored and may be missing locally)."
        )

    deleted = _delete_dev_seed_analytics_runs(session, location.id)

    payload = excel_path.read_bytes()
    normalized_rows, detected_pos = normalize_sales_report(payload)

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

    seed_name = f"{DEV_SEED_PREFIX}{excel_path.name}"
    analytics_run = AnalyticsRun(
        name=seed_name,
        filename=seed_name,
        pos_system=detected_pos,
        period_start=period_start.date() if period_start else None,
        period_end=period_end.date() if period_end else None,
        location_id=location.id,
    )
    session.add(analytics_run)
    session.flush()

    persist_sales_report(
        session,
        normalized_rows,
        detected_pos,
        analytics_run_id=analytics_run.id,
    )

    location_cogs_count = 0
    if cogs_path is not None and cogs_path.exists():
        cogs_by_menu = _load_cogs_by_menu(cogs_path)
        order_facts = (
            session.query(OrderFact).where(OrderFact.analytics_run_id == analytics_run.id).all()
        )
        seen_menus: dict[str, tuple[str | None, str | None]] = {}
        for row in order_facts:
            if row.menu not in seen_menus:
                seen_menus[row.menu] = (row.menu_category, row.menu_category_detail)
        items = [
            LocationCogsUpsertItem(
                menu_name=menu,
                cogs=cogs_by_menu.get(menu, 0.0),
                menu_category=menu_category,
                menu_category_detail=menu_category_detail,
                currency=location.currency or "IDR",
            )
            for menu, (menu_category, menu_category_detail) in seen_menus.items()
        ]
        upsert_location_cogs_bulk(session, location.id, items)
        location_cogs_count = len(items)
        seed_run_cogs_from_location(
            session,
            analytics_run_id=analytics_run.id,
            location_id=location.id,
            menus=seen_menus.keys(),
        )
    elif cogs_path is not None:
        print(f"COGS file not found; skipping location COGS: {cogs_path}")

    session.flush()
    return {
        "deleted_seed_runs": deleted,
        "order_rows": len(normalized_rows),
        "location_cogs": location_cogs_count,
        "analytics_run_id": analytics_run.id,
        "pos_system": detected_pos,
    }


def main(
    *,
    scope: str,
    clerk_user_id: str,
    excel_path: str | None,
    cogs_path: str | None,
) -> int:
    if scope not in SCOPES:
        raise SystemExit(f"ERROR: --scope must be one of {', '.join(SCOPES)}")

    session = SessionLocal()
    try:
        ctx = ensure_workspace_context(session, clerk_user_id)
        session.commit()

        if scope in ("inventar", "all"):
            workspace_id = ctx.workspace.id
            primary_id = ctx.primary_location.id
            branch_id = ctx.branch_location.id
            reset_inventar(session, workspace_id)
            workspace = session.get(Workspace, workspace_id)
            primary = session.get(Location, primary_id)
            branch = session.get(Location, branch_id)
            assert workspace is not None and primary is not None and branch is not None
            counts = seed_inventar(session, workspace, primary, branch)
            session.commit()
            print(
                f"Inventar seed: workspace_id={workspace.id} "
                f"primary_location_id={primary.id} "
                f"branch_location_id={branch.id} "
                f"catalog={counts['catalog_items']} stock={counts['stock_rows']} "
                f"movements={counts['movements']}"
            )

        if scope in ("analytics", "all"):
            excel = Path(excel_path) if excel_path else DEFAULT_EXCEL
            cogs_file: Path | None
            if cogs_path is not None:
                cogs_file = Path(cogs_path)
            elif DEFAULT_COGS.exists():
                cogs_file = DEFAULT_COGS
            else:
                cogs_file = None
            result = seed_analytics(
                session,
                location=ctx.primary_location,
                excel_path=excel,
                cogs_path=cogs_file,
            )
            session.commit()
            print(
                f"Analytics seed: run_id={result['analytics_run_id']} "
                f"orders={result['order_rows']} location_cogs={result['location_cogs']} "
                f"replaced_seed_runs={result['deleted_seed_runs']} "
                f"pos={result['pos_system']}"
            )

        print(
            f"Done. scope={scope!r} clerk_user_id={clerk_user_id!r} "
            f"workspace_id={ctx.workspace.id}. "
            "Other tables (CRM, media, styles, …) were left untouched."
        )
        if ctx.created_primary:
            print("Created primary location with sample opening hours and manual brief.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            "Selective local seed for inventar (default) and/or analytics. "
            "Does not wipe the database."
        )
    )
    parser.add_argument(
        "--scope",
        choices=SCOPES,
        default="inventar",
        help="What to seed (default: inventar)",
    )
    parser.add_argument(
        "--excel",
        default=None,
        help=f"Sales Excel for analytics scope (default: {DEFAULT_EXCEL})",
    )
    parser.add_argument(
        "--cogs",
        default=None,
        metavar="PATH",
        help=f"menu_cogs.json for analytics scope (default: {DEFAULT_COGS} when present)",
    )
    parser.add_argument(
        "--clerk-user-id",
        default=None,
        metavar="ID",
        help="Clerk user id (or set DEV_CLERK_USER_ID / make USER_ID=...)",
    )
    args = parser.parse_args()
    clerk_user_id = _resolve_clerk_user_id(args.clerk_user_id)
    sys.exit(
        main(
            scope=args.scope,
            clerk_user_id=clerk_user_id,
            excel_path=args.excel,
            cogs_path=args.cogs,
        )
    )
