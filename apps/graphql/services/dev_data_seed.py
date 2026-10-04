"""Selective seed for inventar and/or analytics (shared by CLI and staff mutation)."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
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
    Workspace,
    WorkspaceMembership,
)
from graphql.data_sources.models.pos_order import PosOrder
from graphql.reports import normalize_sales_report, persist_sales_report
from graphql.scripts.dev_seed_inventar import reset_inventar, seed_inventar
from graphql.scripts.dev_seed_kaffeestube_menu import (
    KAFFEESTUBE_CATEGORY_LABELS,
    KAFFEESTUBE_MENU_CATALOG,
)
from graphql.scripts.dev_seed_warung_menu import WARUNG_CATEGORY_LABELS, WARUNG_MENU_CATALOG
from graphql.services.location_cogs import (
    LocationCogsUpsertItem,
    seed_run_cogs_from_location,
    upsert_location_cogs_bulk,
)
from graphql.services.manual_quick_profile import validate_and_normalize_quick_profile
from graphql.services.menu import (
    MenuCategoryReplaceInput,
    MenuItemReplaceInput,
    get_or_create_menu,
    replace_menu_categories,
)

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).resolve().parents[3]
DEFAULT_EXCEL = (
    ROOT_DIR / "apps" / "graphql" / "fixtures" / "dev_mock_SalesRecapitulationDetailReport_1mo.xlsx"
)
DEFAULT_COGS = ROOT_DIR / "apps" / "graphql" / "fixtures" / "dev_mock_menu_cogs.json"
LEGACY_COGS = ROOT_DIR / "notebooks" / "data" / "menu_cogs.json"

DEV_SEED_PREFIX = "dev-seed-"
PRIMARY_LOCATION_NAME = "SNABB"
DEV_INVENTAR_LOCATION_NAME = "Warung Sunda Lembur"
DEV_ANALYTICS_LOCATION_NAME = "Kaffeestube Mitte"
DEV_WORKSPACE_NAME = "Dev Workspace"

SCOPES = ("inventar", "analytics", "all", "clear-inventar")


@dataclass(frozen=True)
class WorkspaceContext:
    workspace: Workspace
    primary_location: Location
    inventar_location: Location
    analytics_location: Location
    created_primary: bool


@dataclass
class DevDataSeedResult:
    scope: str
    clerk_user_id: str
    workspace_id: int
    created_primary: bool = False
    inventar_location_id: int | None = None
    inventar_location_name: str | None = None
    analytics_location_id: int | None = None
    analytics_location_name: str | None = None
    inventar_catalog_items: int | None = None
    inventar_stock_rows: int | None = None
    inventar_movements: int | None = None
    inventar_menu_categories: int | None = None
    inventar_menu_items: int | None = None
    inventar_cleared_pos_orders: int | None = None
    analytics_run_id: int | None = None
    analytics_order_rows: int | None = None
    analytics_location_cogs: int | None = None
    analytics_deleted_seed_runs: int | None = None
    analytics_pos_system: str | None = None
    analytics_menu_categories: int | None = None
    analytics_menu_items: int | None = None
    analytics_cleared_pos_orders: int | None = None
    inventar_cleared: bool = False
    notes: list[str] = field(default_factory=list)


def _load_cogs_by_menu(cogs_path: Path) -> dict[str, float]:
    """Load menu_cogs.json and return a dict menu -> cogs (first occurrence per menu)."""
    raw = json.loads(cogs_path.read_text())
    by_menu: dict[str, float] = {}
    for entry in raw:
        menu = entry.get("menu")
        if menu is not None and menu not in by_menu:
            by_menu[menu] = float(entry.get("cogs", 0))
    return by_menu


def _add_default_opening_hours(
    session: Session,
    location_id: int,
    *,
    days: tuple[str, ...] = (
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
    ),
) -> None:
    for day in days:
        session.add(
            LocationOpeningHour(
                location_id=location_id,
                day_of_week=day,
                open_time=time(hour=8, minute=0),
                close_time=time(hour=18, minute=0),
            )
        )


def _replace_opening_hours(
    session: Session,
    location_id: int,
    *,
    days: tuple[str, ...],
) -> None:
    """Replace opening hours so managed seed locations stay aligned with mock traffic."""
    session.query(LocationOpeningHour).filter(
        LocationOpeningHour.location_id == location_id
    ).delete(synchronize_session=False)
    _add_default_opening_hours(session, location_id, days=days)


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


def seed_warung_sunda_menu(session: Session, location: Location) -> dict[str, int]:
    """Replace the curated location menu with the Warung Sunda mock catalog (POS + guest menu).

    Clears POS tickets for this location first so a full catalog reset stays
    free of stale ``pos_order_line`` references.
    """
    deleted_orders = (
        session.query(PosOrder)
        .filter(PosOrder.location_id == location.id)
        .delete(synchronize_session=False)
    )

    by_category: dict[str, list[MenuItemReplaceInput]] = {}
    for item in WARUNG_MENU_CATALOG:
        label = WARUNG_CATEGORY_LABELS.get(item.menu_category, item.menu_category.title())
        by_category.setdefault(label, []).append(
            MenuItemReplaceInput(
                name=item.menu,
                price=float(item.price),
                description=item.menu_category_detail.title() if item.menu_category_detail else "",
                is_available=True,
                dietary_tags=list(item.dietary_tags),
                allergens=list(item.allergens),
            )
        )

    preferred = ["Makanan", "Minuman"]
    ordered_names = [name for name in preferred if name in by_category] + sorted(
        name for name in by_category if name not in preferred
    )
    categories = [
        MenuCategoryReplaceInput(name=name, items=by_category[name]) for name in ordered_names
    ]

    menu = get_or_create_menu(session, location.id, title=DEV_INVENTAR_LOCATION_NAME)
    menu.title = DEV_INVENTAR_LOCATION_NAME
    replace_menu_categories(session, menu, categories)
    session.flush()
    item_count = sum(len(cat.items) for cat in categories)
    return {
        "categories": len(categories),
        "items": item_count,
        "cleared_pos_orders": int(deleted_orders or 0),
    }


def seed_kaffeestube_menu(session: Session, location: Location) -> dict[str, int]:
    """Replace the curated location menu with the Berlin cafe mock catalog (POS + guest menu).

    Clears POS tickets for this location first so a full catalog reset stays
    free of stale ``pos_order_line`` references.
    """
    deleted_orders = (
        session.query(PosOrder)
        .filter(PosOrder.location_id == location.id)
        .delete(synchronize_session=False)
    )

    by_category: dict[str, list[MenuItemReplaceInput]] = {}
    for item in KAFFEESTUBE_MENU_CATALOG:
        label = KAFFEESTUBE_CATEGORY_LABELS.get(item.menu_category, item.menu_category.title())
        by_category.setdefault(label, []).append(
            MenuItemReplaceInput(
                name=item.menu,
                price=float(item.price),
                description=item.menu_category_detail.title() if item.menu_category_detail else "",
                is_available=True,
                dietary_tags=list(item.dietary_tags),
                allergens=list(item.allergens),
            )
        )

    preferred = ["Coffee", "Tea", "Soft Drinks", "Bakery", "Food"]
    ordered_names = [name for name in preferred if name in by_category] + sorted(
        name for name in by_category if name not in preferred
    )
    categories = [
        MenuCategoryReplaceInput(name=name, items=by_category[name]) for name in ordered_names
    ]

    menu = get_or_create_menu(session, location.id, title=DEV_ANALYTICS_LOCATION_NAME)
    menu.title = DEV_ANALYTICS_LOCATION_NAME
    replace_menu_categories(session, menu, categories)
    session.flush()
    item_count = sum(len(cat.items) for cat in categories)
    return {
        "categories": len(categories),
        "items": item_count,
        "cleared_pos_orders": int(deleted_orders or 0),
    }


def _ensure_location(
    session: Session,
    *,
    workspace: Workspace,
    clerk_user_id: str,
    name: str,
    city: str,
    country: str,
    currency: str,
    opening_days: tuple[str, ...],
) -> Location:
    location = (
        session.query(Location)
        .filter(Location.workspace_id == workspace.id, Location.name == name)
        .first()
    )
    if location is None:
        location = Location(
            name=name,
            city=city,
            country=country,
            currency=currency,
            workspace_id=workspace.id,
            clerk_user_id=clerk_user_id,
        )
        session.add(location)
        session.flush()
    elif not location.clerk_user_id:
        location.clerk_user_id = clerk_user_id
    _replace_opening_hours(session, location.id, days=opening_days)
    return location


def ensure_workspace_context(session: Session, clerk_user_id: str) -> WorkspaceContext:
    """Find or create workspace, SNABB primary, inventar, and Berlin analytics locations."""
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

    inventar = _ensure_location(
        session,
        workspace=workspace,
        clerk_user_id=clerk_user_id,
        name=DEV_INVENTAR_LOCATION_NAME,
        city="Jakarta",
        country="Indonesia",
        currency="IDR",
        opening_days=("monday", "tuesday", "wednesday", "thursday", "friday"),
    )
    analytics = _ensure_location(
        session,
        workspace=workspace,
        clerk_user_id=clerk_user_id,
        name=DEV_ANALYTICS_LOCATION_NAME,
        city="Berlin",
        country="Germany",
        currency="EUR",
        opening_days=(
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ),
    )

    session.flush()
    return WorkspaceContext(
        workspace=workspace,
        primary_location=primary,
        inventar_location=inventar,
        analytics_location=analytics,
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
) -> dict[str, int | str | list[str]]:
    if not excel_path.exists():
        raise FileNotFoundError(
            f"Excel file not found: {excel_path}. "
            "Pass --excel / EXCEL= for SCOPE=analytics|all, or run "
            "`make generate-dev-mock-excel` to rebuild the default fixture."
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
    notes: list[str] = []
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
        note = f"COGS file not found; skipping location COGS: {cogs_path}"
        notes.append(note)
        logger.warning(note)

    session.flush()
    return {
        "deleted_seed_runs": deleted,
        "order_rows": len(normalized_rows),
        "location_cogs": location_cogs_count,
        "analytics_run_id": analytics_run.id,
        "pos_system": detected_pos,
        "notes": notes,
    }


def resolve_default_cogs_path(cogs_path: str | Path | None) -> Path | None:
    if cogs_path is not None:
        return Path(cogs_path)
    if DEFAULT_COGS.exists():
        return DEFAULT_COGS
    if LEGACY_COGS.exists():
        return LEGACY_COGS
    return None


def run_dev_data_seed(
    session: Session,
    *,
    scope: str,
    clerk_user_id: str,
    excel_path: str | Path | None = None,
    cogs_path: str | Path | None = None,
) -> DevDataSeedResult:
    """Run selective seed into the workspace for ``clerk_user_id``. Caller commits."""
    if scope not in SCOPES:
        raise ValueError(f"scope must be one of {', '.join(SCOPES)}")

    target_user = (clerk_user_id or "").strip()
    if not target_user:
        raise ValueError("clerk_user_id is required")

    ctx = ensure_workspace_context(session, target_user)
    session.flush()

    result = DevDataSeedResult(
        scope=scope,
        clerk_user_id=target_user,
        workspace_id=ctx.workspace.id,
        created_primary=ctx.created_primary,
        inventar_location_id=ctx.inventar_location.id,
        inventar_location_name=ctx.inventar_location.name,
        analytics_location_id=ctx.analytics_location.id,
        analytics_location_name=ctx.analytics_location.name,
    )

    if scope == "clear-inventar":
        reset_inventar(session, ctx.workspace.id)
        session.flush()
        result.inventar_cleared = True
        return result

    if scope in ("inventar", "all"):
        workspace_id = ctx.workspace.id
        inventar_id = ctx.inventar_location.id
        reset_inventar(session, workspace_id)
        workspace = session.get(Workspace, workspace_id)
        inventar = session.get(Location, inventar_id)
        assert workspace is not None and inventar is not None
        counts = seed_inventar(
            session,
            workspace,
            inventar,
            clerk_user_id=target_user,
        )
        menu_counts = seed_warung_sunda_menu(session, inventar)
        session.flush()
        result.inventar_catalog_items = counts["catalog_items"]
        result.inventar_stock_rows = counts["stock_rows"]
        result.inventar_movements = counts["movements"]
        result.inventar_menu_categories = menu_counts["categories"]
        result.inventar_menu_items = menu_counts["items"]
        result.inventar_cleared_pos_orders = menu_counts["cleared_pos_orders"]

    if scope in ("analytics", "all"):
        excel = Path(excel_path) if excel_path else DEFAULT_EXCEL
        cogs_file = resolve_default_cogs_path(cogs_path)
        analytics_location = session.get(Location, ctx.analytics_location.id)
        assert analytics_location is not None
        analytics_result = seed_analytics(
            session,
            location=analytics_location,
            excel_path=excel,
            cogs_path=cogs_file,
        )
        menu_counts = seed_kaffeestube_menu(session, analytics_location)
        session.flush()
        result.analytics_run_id = int(analytics_result["analytics_run_id"])
        result.analytics_order_rows = int(analytics_result["order_rows"])
        result.analytics_location_cogs = int(analytics_result["location_cogs"])
        result.analytics_deleted_seed_runs = int(analytics_result["deleted_seed_runs"])
        result.analytics_pos_system = str(analytics_result["pos_system"])
        result.analytics_menu_categories = menu_counts["categories"]
        result.analytics_menu_items = menu_counts["items"]
        result.analytics_cleared_pos_orders = menu_counts["cleared_pos_orders"]
        notes = analytics_result.get("notes")
        if isinstance(notes, list):
            result.notes.extend(str(n) for n in notes)

    return result
