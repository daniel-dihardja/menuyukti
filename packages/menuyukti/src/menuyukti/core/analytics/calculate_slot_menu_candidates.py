"""Per-slot menu promotion candidates: slot sales joined with global menu engineering."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from typing import Literal, NotRequired, TypedDict

from menuyukti.core.analytics.calculate_menu_engineering_matrix import (
    MenuEngineeringMatrixItem,
    OrderRowForMatrix,
    compute_menu_engineering_from_orders,
)
from menuyukti.core.analytics.calculate_slot_demand_profile import (
    OrderRowForSlotDemand,
    PromoPosture,
    RelativeDemand,
    SlotDemandCell,
    compute_slot_demand_profile_from_orders,
)
from menuyukti.core.analytics.demand_labels import posture_from_relative
from menuyukti.core.analytics.meal_periods import MEAL_PERIODS, WEEKDAY_ORDER
from menuyukti.core.analytics.slot_keys import slot_key

MatrixCategory = Literal["star", "puzzle", "plow_horse", "low_end"]
MatrixAction = Literal["keep", "promote", "reprice", "remove"]
RecommendedUse = Literal["hero", "grow", "maintain", "avoid"]
SlotsFilter = Literal["all", "priority"]

DEFAULT_MAX_CANDIDATES_PER_SLOT = 5
DEFAULT_MIN_VENUE_ORDERS_IN_SLOT = 8
DEFAULT_MIN_ITEM_QTY_IN_SLOT = 2

_SLOT_SHARE_WEIGHT = 0.55
_SLOT_AFFINITY_WEIGHT = 0.35


class OrderRowForSlotMenuCandidates(TypedDict):
    """One order line with timestamp for slot × menu aggregation."""

    menu: str
    qty: int | float
    order_time: datetime
    menu_category: NotRequired[str | None]
    menu_category_detail: NotRequired[str | None]
    total_after_bill_discount: NotRequired[float]


class SlotMenuCandidatesOptions(TypedDict, total=False):
    max_candidates_per_slot: int
    min_venue_orders_in_slot: int
    min_item_qty_in_slot: int
    include_low_end: bool
    slots_filter: SlotsFilter


class SlotMenuCandidateItem(TypedDict):
    menu: str
    global_category: MatrixCategory | None
    global_action: MatrixAction | None
    slot_quantity: int
    slot_share: float
    slot_affinity: float
    slot_revenue: float | None
    contribution_margin: float | None
    contribution_margin_percentage: float | None
    menu_category: str | None
    menu_category_detail: str | None
    rank: int
    score: float
    recommended_use: RecommendedUse


class SlotMenuCandidatesCell(TypedDict):
    day: str
    meal_period: str
    meal_period_label: str
    meal_period_hours_label: str
    order_count: int
    demand_index: float
    relative_demand: RelativeDemand
    posture: PromoPosture
    recommended_categories: list[MatrixCategory]
    total_item_quantity: int
    insufficient_data: bool
    candidates: list[SlotMenuCandidateItem]


class SlotMenuCandidatesResult(TypedDict):
    reporting_period: str
    matrix_available: bool
    coverage_notes: list[str]
    slots: list[SlotMenuCandidatesCell]


def _recommended_categories(posture: PromoPosture) -> list[MatrixCategory]:
    if posture == "support":
        return ["star", "plow_horse"]
    if posture == "promote":
        return ["puzzle", "plow_horse"]
    return ["star", "puzzle"]


def _category_boost(
    posture: PromoPosture,
    category: MatrixCategory | None,
    recommended: list[MatrixCategory],
) -> float:
    if category is None:
        return 0.0
    boost = 0.0
    if category in recommended:
        boost += 0.15
    if posture == "support" and category == "star":
        boost += 0.05
    if posture == "promote" and category == "puzzle":
        boost += 0.10
    return boost


def _recommended_use(
    posture: PromoPosture,
    category: MatrixCategory | None,
) -> RecommendedUse:
    if category == "low_end":
        return "avoid"
    if posture == "support" and category == "star":
        return "hero"
    if posture == "promote" and category == "puzzle":
        return "grow"
    return "maintain"


def _resolve_options(options: SlotMenuCandidatesOptions | None) -> dict[str, object]:
    opts = options or {}
    return {
        "max_candidates_per_slot": int(
            opts.get("max_candidates_per_slot", DEFAULT_MAX_CANDIDATES_PER_SLOT)
        ),
        "min_venue_orders_in_slot": int(
            opts.get("min_venue_orders_in_slot", DEFAULT_MIN_VENUE_ORDERS_IN_SLOT)
        ),
        "min_item_qty_in_slot": int(
            opts.get("min_item_qty_in_slot", DEFAULT_MIN_ITEM_QTY_IN_SLOT)
        ),
        "include_low_end": bool(opts.get("include_low_end", False)),
        "slots_filter": str(opts.get("slots_filter", "all")),
    }


def _parse_order_time(value: datetime) -> datetime:
    if hasattr(value, "to_pydatetime"):
        return value.to_pydatetime()  # type: ignore[union-attr]
    return value


def _aggregate_slot_menu_sales(
    order_rows: list[OrderRowForSlotMenuCandidates],
) -> tuple[
    dict[tuple[str, str, str], float],
    dict[tuple[str, str, str], float],
    dict[str, float],
    str,
]:
    slot_qty: dict[tuple[str, str, str], float] = defaultdict(float)
    slot_revenue: dict[tuple[str, str, str], float] = defaultdict(float)
    menu_total_qty: dict[str, float] = defaultdict(float)
    min_time: datetime | None = None

    for row in order_rows:
        menu = str(row.get("menu") or "").strip()
        if not menu:
            continue
        qty = float(row.get("qty") or 0.0)
        if qty <= 0:
            continue
        dt = _parse_order_time(row["order_time"])
        if min_time is None or dt < min_time:
            min_time = dt
        day, period = slot_key(dt)
        slot_key_tuple = (day, period, menu)
        slot_qty[slot_key_tuple] += qty
        menu_total_qty[menu] += qty
        revenue_raw = row.get("total_after_bill_discount")
        if isinstance(revenue_raw, (int, float)) and not isinstance(revenue_raw, bool):
            slot_revenue[slot_key_tuple] += float(revenue_raw)

    reporting_period = min_time.strftime("%Y-%m") if min_time is not None else ""
    return slot_qty, slot_revenue, menu_total_qty, reporting_period


def _matrix_lookup(
    matrix_rows: list[OrderRowForMatrix],
    cogs_by_menu: dict[str, float],
) -> tuple[dict[str, MenuEngineeringMatrixItem], bool]:
    try:
        matrix = compute_menu_engineering_from_orders(matrix_rows, cogs_by_menu)
    except ValueError:
        return {}, False
    by_menu = {str(item["menu"]): item for item in matrix.get("items", [])}
    return by_menu, True


def _slot_profile_lookup(profile: list[SlotDemandCell]) -> dict[tuple[str, str], SlotDemandCell]:
    return {(cell["day"], cell["meal_period"]): cell for cell in profile}


def _build_candidates_for_slot(
    *,
    day: str,
    period: str,
    cell: SlotDemandCell,
    slot_qty: dict[tuple[str, str, str], float],
    slot_revenue: dict[tuple[str, str, str], float],
    menu_total_qty: dict[str, float],
    matrix_by_menu: dict[str, MenuEngineeringMatrixItem],
    resolved: dict[str, object],
) -> SlotMenuCandidatesCell:
    posture = posture_from_relative(cell["relative_demand"])
    recommended = _recommended_categories(posture)
    min_venue_orders = int(resolved["min_venue_orders_in_slot"])
    min_item_qty = int(resolved["min_item_qty_in_slot"])
    max_candidates = int(resolved["max_candidates_per_slot"])
    include_low_end = bool(resolved["include_low_end"])

    insufficient = cell["order_count"] < min_venue_orders
    menus_in_slot = {
        menu: qty
        for (slot_day, slot_period, menu), qty in slot_qty.items()
        if slot_day == day and slot_period == period and qty >= min_item_qty
    }
    total_item_quantity = int(sum(menus_in_slot.values()))

    if insufficient or not menus_in_slot:
        return SlotMenuCandidatesCell(
            day=day,
            meal_period=period,
            meal_period_label=cell["meal_period_label"],
            meal_period_hours_label=cell["meal_period_hours_label"],
            order_count=cell["order_count"],
            demand_index=cell["demand_index"],
            relative_demand=cell["relative_demand"],
            posture=posture,
            recommended_categories=recommended,
            total_item_quantity=total_item_quantity,
            insufficient_data=insufficient,
            candidates=[],
        )

    scored: list[tuple[float, int, str, SlotMenuCandidateItem]] = []
    for menu, qty_f in menus_in_slot.items():
        qty = int(qty_f)
        matrix_item = matrix_by_menu.get(menu)
        category: MatrixCategory | None = None
        action: MatrixAction | None = None
        contribution_margin: float | None = None
        contribution_margin_pct: float | None = None
        menu_category: str | None = None
        menu_category_detail: str | None = None

        if matrix_item is not None:
            category = matrix_item["category"]  # type: ignore[assignment]
            action = matrix_item["action"]  # type: ignore[assignment]
            contribution_margin = float(matrix_item.get("contribution_margin") or 0.0)
            contribution_margin_pct = float(
                matrix_item.get("contribution_margin_percentage") or 0.0
            )
            mc = matrix_item.get("menu_category")
            mcd = matrix_item.get("menu_category_detail")
            menu_category = mc if isinstance(mc, str) else None
            menu_category_detail = mcd if isinstance(mcd, str) else None
            if category == "low_end" and not include_low_end:
                continue

        total_menu_qty = menu_total_qty.get(menu, 0.0)
        slot_share = qty_f / total_item_quantity if total_item_quantity > 0 else 0.0
        slot_affinity = qty_f / total_menu_qty if total_menu_qty > 0 else 0.0
        boost = _category_boost(posture, category, recommended)
        score = round(
            _SLOT_SHARE_WEIGHT * slot_share
            + _SLOT_AFFINITY_WEIGHT * slot_affinity
            + boost,
            6,
        )
        rev_key = (day, period, menu)
        slot_rev = slot_revenue.get(rev_key)
        scored.append(
            (
                score,
                qty,
                menu,
                SlotMenuCandidateItem(
                    menu=menu,
                    global_category=category,
                    global_action=action,
                    slot_quantity=qty,
                    slot_share=round(slot_share, 6),
                    slot_affinity=round(slot_affinity, 6),
                    slot_revenue=round(slot_rev, 2) if slot_rev is not None else None,
                    contribution_margin=(
                        round(contribution_margin, 2)
                        if contribution_margin is not None
                        else None
                    ),
                    contribution_margin_percentage=(
                        round(contribution_margin_pct, 6)
                        if contribution_margin_pct is not None
                        else None
                    ),
                    menu_category=menu_category,
                    menu_category_detail=menu_category_detail,
                    rank=0,
                    score=score,
                    recommended_use=_recommended_use(posture, category),
                ),
            )
        )

    scored.sort(key=lambda row: (-row[0], -row[1], row[2]))
    candidates: list[SlotMenuCandidateItem] = []
    for rank, (_, _qty, _menu, item) in enumerate(scored[:max_candidates], start=1):
        item["rank"] = rank
        candidates.append(item)

    return SlotMenuCandidatesCell(
        day=day,
        meal_period=period,
        meal_period_label=cell["meal_period_label"],
        meal_period_hours_label=cell["meal_period_hours_label"],
        order_count=cell["order_count"],
        demand_index=cell["demand_index"],
        relative_demand=cell["relative_demand"],
        posture=posture,
        recommended_categories=recommended,
        total_item_quantity=total_item_quantity,
        insufficient_data=False,
        candidates=candidates,
    )


def compute_slot_menu_candidates(
    order_rows: list[OrderRowForSlotMenuCandidates],
    combo_timing_rows: list[OrderRowForSlotDemand],
    cogs_by_menu: dict[str, float],
    *,
    matrix_rows: list[OrderRowForMatrix] | None = None,
    options: SlotMenuCandidatesOptions | None = None,
    slot_profile: list[SlotDemandCell] | None = None,
) -> SlotMenuCandidatesResult:
    """
    Rank menu promotion candidates per venue slot (day × meal_period).

    Combines venue slot demand profile, per-slot menu sales from order lines,
    and global menu engineering classification (not per-slot BCG).

    Scoring::

        score = 0.55 * slot_share + 0.35 * slot_affinity + category_boost

    When the global matrix is unavailable (no COGS), candidates are ranked by
    slot sales only and ``global_category`` is null.
    """
    if not order_rows:
        msg = "order_rows must not be empty"
        raise ValueError(msg)

    resolved = _resolve_options(options)
    profile = (
        slot_profile
        if slot_profile is not None
        else compute_slot_demand_profile_from_orders(combo_timing_rows)
    )
    profile_by_key = _slot_profile_lookup(profile)

    matrix_input = matrix_rows if matrix_rows is not None else [
        {
            "menu": str(row["menu"]),
            "qty": row["qty"],
            "total_after_bill_discount": float(row.get("total_after_bill_discount") or 0.0),
            "menu_category": row.get("menu_category"),
            "menu_category_detail": row.get("menu_category_detail"),
        }
        for row in order_rows
        if str(row.get("menu") or "").strip()
    ]
    matrix_by_menu, matrix_available = _matrix_lookup(matrix_input, cogs_by_menu)

    slot_qty, slot_revenue, menu_total_qty, reporting_period = _aggregate_slot_menu_sales(
        order_rows
    )

    cells: list[SlotMenuCandidatesCell] = []
    insufficient_count = 0
    for day in WEEKDAY_ORDER:
        for period, _label, _hours in MEAL_PERIODS:
            cell = profile_by_key.get(
                (day, period),
                SlotDemandCell(
                    day=day,
                    meal_period=period,
                    meal_period_label="",
                    meal_period_hours_label="",
                    order_count=0,
                    traffic_share=0.0,
                    demand_index=0.0,
                    relative_demand="average",
                ),
            )
            built = _build_candidates_for_slot(
                day=day,
                period=period,
                cell=cell,
                slot_qty=slot_qty,
                slot_revenue=slot_revenue,
                menu_total_qty=menu_total_qty,
                matrix_by_menu=matrix_by_menu,
                resolved=resolved,
            )
            if built["insufficient_data"]:
                insufficient_count += 1
            cells.append(built)

    slots_filter = str(resolved["slots_filter"])
    if slots_filter == "priority":
        cells = [c for c in cells if c["posture"] in ("promote", "support")]

    coverage_notes: list[str] = []
    if not matrix_available:
        coverage_notes.append(
            "Menu engineering matrix unavailable; candidates ranked by slot sales only."
        )
    if insufficient_count:
        coverage_notes.append(
            f"{insufficient_count} slot(s) below minimum venue order threshold."
        )

    return SlotMenuCandidatesResult(
        reporting_period=reporting_period,
        matrix_available=matrix_available,
        coverage_notes=coverage_notes,
        slots=cells,
    )
