"""Load and format workflow visualization chart data for chat tools."""

from __future__ import annotations

from typing import Any, Literal

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    ANALYTICS_RUNS_QUERY,
    LOCATION_QUERY,
    MENU_COMBOS_LIFT_MATRIX_CHAT_QUERY,
    MENU_ENGINEERING_MATRIX_QUERY,
    MENU_HEATMAPS_CHAT_QUERY,
    ORDER_METRICS_SLOT_DEMAND_QUERY,
)

ChartId = Literal[
    "venue_slot_strength_heatmap",
    "menu_item_heatmap",
    "pair_lift_matrix_heatmap",
]

CHART_IDS: tuple[ChartId, ...] = (
    "venue_slot_strength_heatmap",
    "menu_item_heatmap",
    "pair_lift_matrix_heatmap",
)

CHART_TITLES: dict[ChartId, str] = {
    "venue_slot_strength_heatmap": "Venue slot strength",
    "menu_item_heatmap": "Menu item heatmap",
    "pair_lift_matrix_heatmap": "Pair lift matrix",
}

MENU_HEATMAP_CHAT_TOP_N = 25
# When menu-engineering matrix data exists, chat heatmaps keep only these BCG roles.
HEATMAP_MATRIX_CHAT_CATEGORIES: frozenset[str] = frozenset({"star", "plow_horse", "puzzle"})
_DEFAULT_DAILY_START_HOUR = 8
_DEFAULT_DAILY_END_HOUR = 22
_FALLBACK_NOTE = (
    "*(Data from a newer sales report for this location because the "
    "workflow-linked report had no data for this chart.)*"
)
_HEATMAP_MATRIX_FILTER_NOTE = "*(Filtered to star, plow horse, and puzzle menu-engineering items.)*"


def is_chart_id(value: str) -> bool:
    return value in CHART_IDS


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def format_slot_demand_profile(cells: list[dict[str, Any]]) -> str:
    if not cells:
        return "(no slot demand data)"
    lines: list[str] = []
    for cell in cells:
        day = str(cell.get("day") or "")
        label = str(cell.get("mealPeriodLabel") or "")
        hours = str(cell.get("mealPeriodHoursLabel") or "")
        orders = _as_int(cell.get("orderCount"))
        demand_index = _as_float(cell.get("demandIndex"))
        relative = str(cell.get("relativeDemand") or "")
        lines.append(
            f"- **{day} / {label}** ({hours}): {orders} orders, "
            f"demand index {demand_index:.2f}, {relative} demand"
        )
    return "\n".join(lines)


def format_pair_lift_matrix(payload: dict[str, Any]) -> str:
    focus_menus_raw = payload.get("focusMenus")
    focus_menus = [str(m) for m in focus_menus_raw] if isinstance(focus_menus_raw, list) else []
    if len(focus_menus) < 2:
        return "(not enough focus menu items for a lift matrix)"

    matrix_raw = payload.get("matrixLift")
    matrix: list[list[Any]] = matrix_raw if isinstance(matrix_raw, list) else []

    meta: list[str] = []
    if isinstance(payload.get("totalOrders"), (int, float)):
        meta.append(f"- **Total Orders:** {_as_int(payload.get('totalOrders'))}")
    if isinstance(payload.get("multiItemOrderCount"), (int, float)):
        meta.append(f"- **Multi Item Order Count:** {_as_int(payload.get('multiItemOrderCount'))}")
    scope = payload.get("scope")
    if isinstance(scope, str) and scope.strip():
        meta.append(f"- **Scope:** {scope.strip()}")

    header = f"| Menu | {' | '.join(focus_menus)} |"
    separator = f"| --- | {' | '.join(['---'] * len(focus_menus))} |"
    body: list[str] = []
    for row_index, menu in enumerate(focus_menus):
        row = matrix[row_index] if row_index < len(matrix) else []
        values: list[str] = []
        for col_index in range(len(focus_menus)):
            if row_index == col_index:
                values.append("—")
                continue
            value = row[col_index] if isinstance(row, list) and col_index < len(row) else None
            if value is None:
                values.append("—")
            else:
                values.append(f"{_as_float(value):.2f}")
        body.append(f"| {menu} | {' | '.join(values)} |")

    return "\n".join([*meta, "", header, separator, *body])


def _weekly_total(item: dict[str, Any]) -> int:
    weekly = item.get("weeklyHeatmap")
    if not isinstance(weekly, list):
        return 0
    return sum(_as_int(cell.get("quantity")) for cell in weekly if isinstance(cell, dict))


def _peak_weekly_day(item: dict[str, Any]) -> tuple[str, int] | None:
    weekly = item.get("weeklyHeatmap")
    if not isinstance(weekly, list) or not weekly:
        return None
    best: dict[str, Any] | None = None
    for cell in weekly:
        if not isinstance(cell, dict):
            continue
        if best is None or _as_int(cell.get("quantity")) > _as_int(best.get("quantity")):
            best = cell
    if best is None:
        return None
    return str(best.get("day") or "unknown"), _as_int(best.get("quantity"))


def _peak_daily_hour(item: dict[str, Any]) -> tuple[int, int] | None:
    daily = item.get("dailyHeatmap")
    if not isinstance(daily, list) or not daily:
        return None
    best: dict[str, Any] | None = None
    for cell in daily:
        if not isinstance(cell, dict):
            continue
        if best is None or _as_int(cell.get("quantity")) > _as_int(best.get("quantity")):
            best = cell
    if best is None:
        return None
    return _as_int(best.get("hour")), _as_int(best.get("quantity"))


def _normalize_matrix_category(raw: Any) -> str | None:
    if not isinstance(raw, str):
        return None
    value = raw.strip().lower().replace(" ", "_").replace("-", "_")
    if value in {"star", "plow_horse", "puzzle", "low_end"}:
        return value
    return None


def matrix_category_by_menu(matrix_items: list[dict[str, Any]]) -> dict[str, str]:
    """Map trimmed menu name → BCG category (last duplicate wins)."""
    out: dict[str, str] = {}
    for item in matrix_items:
        menu_raw = item.get("menu")
        if not isinstance(menu_raw, str):
            continue
        menu = menu_raw.strip()
        if not menu:
            continue
        category = _normalize_matrix_category(item.get("category"))
        if category is None:
            continue
        out[menu] = category
    return out


def filter_heatmaps_for_chat(
    heatmaps: list[dict[str, Any]],
    matrix_items: list[dict[str, Any]] | None,
) -> tuple[list[dict[str, Any]], dict[str, str], bool]:
    """When matrix data exists, keep only star / plow_horse / puzzle heatmaps.

    Returns ``(filtered_heatmaps, category_by_menu, applied_filter)``.
    """
    if not matrix_items:
        return heatmaps, {}, False

    by_menu = matrix_category_by_menu(matrix_items)
    if not by_menu:
        return heatmaps, {}, False

    allowed = {
        menu for menu, category in by_menu.items() if category in HEATMAP_MATRIX_CHAT_CATEGORIES
    }
    filtered = [
        item
        for item in heatmaps
        if isinstance(item.get("menu"), str) and item["menu"].strip() in allowed
    ]
    return filtered, by_menu, True


def format_menu_heatmap_summary(
    items: list[dict[str, Any]],
    *,
    daily_start_hour: int | None = None,
    daily_end_hour: int | None = None,
    matrix_category_by_menu_map: dict[str, str] | None = None,
    matrix_filter_applied: bool = False,
) -> str:
    if not items:
        return "(no menu heatmap data)"

    sorted_items = sorted(items, key=_weekly_total, reverse=True)
    top = sorted_items[:MENU_HEATMAP_CHAT_TOP_N]
    omitted = len(sorted_items) - len(top)
    category_map = matrix_category_by_menu_map or {}

    lines: list[str] = []
    if daily_start_hour is not None and daily_end_hour is not None:
        lines.append(f"- **Daily hour range:** {daily_start_hour}:00–{daily_end_hour}:00")
    if matrix_filter_applied:
        lines.append(_HEATMAP_MATRIX_FILTER_NOTE)

    for index, item in enumerate(top):
        total = _weekly_total(item)
        peak_day = _peak_weekly_day(item)
        peak_hour = _peak_daily_hour(item)
        category_raw = item.get("menuCategory")
        category = (
            category_raw.strip()
            if isinstance(category_raw, str) and category_raw.strip()
            else "Uncategorized"
        )
        menu = str(item.get("menu") or "Unknown")
        matrix_cat = category_map.get(menu.strip())
        role_suffix = f", {matrix_cat}" if matrix_cat else ""
        peak_day_label = (
            f"{peak_day[0]} ({peak_day[1]} units)" if peak_day is not None else "unknown"
        )
        peak_hour_label = (
            f"hour {peak_hour[0]} ({peak_hour[1]} units)" if peak_hour is not None else "unknown"
        )
        lines.append(
            f"- **{index + 1}. {menu}** ({category}{role_suffix}): weekly total {total}, "
            f"peak day {peak_day_label}, peak hour {peak_hour_label}"
        )

    if omitted > 0:
        lines.append(
            f"- *(Showing top {MENU_HEATMAP_CHAT_TOP_N} of {len(sorted_items)} "
            "menu items; hourly breakdown omitted.)*"
        )

    return "\n".join(lines)


def format_chart_markdown_section(
    *,
    chart_id: ChartId,
    payload: dict[str, Any],
    used_fallback_run: bool = False,
) -> str:
    title = CHART_TITLES[chart_id]
    lines = [f"## Visualization data — {title}"]
    if used_fallback_run:
        lines.append(_FALLBACK_NOTE)

    if chart_id == "venue_slot_strength_heatmap":
        cells_raw = payload.get("slotDemandProfile")
        cells = cells_raw if isinstance(cells_raw, list) else []
        lines.append(format_slot_demand_profile([c for c in cells if isinstance(c, dict)]))
    elif chart_id == "menu_item_heatmap":
        items_raw = payload.get("menuHeatmaps")
        items = items_raw if isinstance(items_raw, list) else []
        start = payload.get("dailyStartHour")
        end = payload.get("dailyEndHour")
        category_map_raw = payload.get("matrixCategoryByMenu")
        category_map = (
            {str(k): str(v) for k, v in category_map_raw.items()}
            if isinstance(category_map_raw, dict)
            else None
        )
        lines.append(
            format_menu_heatmap_summary(
                [i for i in items if isinstance(i, dict)],
                daily_start_hour=_as_int(start) if start is not None else None,
                daily_end_hour=_as_int(end) if end is not None else None,
                matrix_category_by_menu_map=category_map,
                matrix_filter_applied=bool(payload.get("matrixFilterApplied")),
            )
        )
    else:
        lines.append(format_pair_lift_matrix(payload))

    return "\n".join(lines)


def _parse_hour_from_time(time: str) -> int | None:
    trimmed = time.strip()
    if not trimmed:
        return None
    parts = trimmed.split(":")
    if len(parts) < 2:
        return None
    try:
        hour = int(parts[0])
    except ValueError:
        return None
    if hour < 0 or hour > 23:
        return None
    return hour


def derive_daily_heatmap_hour_range(
    opening_hours: list[dict[str, Any]],
) -> tuple[int, int]:
    open_hours: list[int] = []
    close_hours: list[int] = []
    for entry in opening_hours:
        open_raw = entry.get("openTime")
        close_raw = entry.get("closeTime")
        if not isinstance(open_raw, str) or not isinstance(close_raw, str):
            continue
        open_h = _parse_hour_from_time(open_raw)
        close_h = _parse_hour_from_time(close_raw)
        if open_h is None or close_h is None or open_h >= close_h:
            continue
        open_hours.append(open_h)
        close_hours.append(close_h)
    if not open_hours or not close_hours:
        return _DEFAULT_DAILY_START_HOUR, _DEFAULT_DAILY_END_HOUR
    start = min(open_hours)
    end = max(close_hours)
    if start > end:
        return _DEFAULT_DAILY_START_HOUR, _DEFAULT_DAILY_END_HOUR
    return start, end


async def _list_analytics_run_ids(
    client: httpx.AsyncClient,
    *,
    location_id: int,
    user_id: str,
) -> list[str]:
    data = await graphql_post(
        client,
        ANALYTICS_RUNS_QUERY,
        {"locationId": location_id, "first": 300},
        user_id,
    )
    runs = data.get("analyticsRuns")
    if not isinstance(runs, list):
        return []
    out: list[str] = []
    for run in runs:
        if isinstance(run, dict) and run.get("id") is not None:
            out.append(str(run["id"]))
    return out


async def _fetch_slot_demand(
    client: httpx.AsyncClient,
    *,
    analytics_run_id: str,
    user_id: str,
) -> list[dict[str, Any]]:
    data = await graphql_post(
        client,
        ORDER_METRICS_SLOT_DEMAND_QUERY,
        {"analyticsRunId": analytics_run_id},
        user_id,
    )
    metrics = data.get("orderMetrics")
    if not isinstance(metrics, dict):
        return []
    profile = metrics.get("slotDemandProfile")
    if not isinstance(profile, list):
        return []
    return [c for c in profile if isinstance(c, dict)]


async def _fetch_menu_heatmaps(
    client: httpx.AsyncClient,
    *,
    analytics_run_id: str,
    location_id: int,
    user_id: str,
) -> list[dict[str, Any]]:
    data = await graphql_post(
        client,
        MENU_HEATMAPS_CHAT_QUERY,
        {"id": analytics_run_id, "locationId": str(location_id)},
        user_id,
    )
    heatmaps = data.get("menuHeatmaps")
    if not isinstance(heatmaps, list):
        return []
    return [h for h in heatmaps if isinstance(h, dict)]


async def _fetch_menu_engineering_matrix_items(
    client: httpx.AsyncClient,
    *,
    analytics_run_id: str,
    location_id: int,
    user_id: str,
) -> list[dict[str, Any]] | None:
    data = await graphql_post(
        client,
        MENU_ENGINEERING_MATRIX_QUERY,
        {
            "analyticsRunId": analytics_run_id,
            "locationId": str(location_id),
        },
        user_id,
    )
    matrix = data.get("menuEngineeringMatrix")
    if not isinstance(matrix, dict):
        return None
    items = matrix.get("items")
    if not isinstance(items, list) or len(items) == 0:
        return None
    return [i for i in items if isinstance(i, dict)]


async def _fetch_pair_lift(
    client: httpx.AsyncClient,
    *,
    analytics_run_id: str,
    location_id: int,
    user_id: str,
) -> dict[str, Any] | None:
    data = await graphql_post(
        client,
        MENU_COMBOS_LIFT_MATRIX_CHAT_QUERY,
        {"id": analytics_run_id, "locationId": str(location_id)},
        user_id,
    )
    combos = data.get("menuCombos")
    if not isinstance(combos, dict):
        return None
    return combos


def _has_lift_matrix_data(payload: dict[str, Any] | None) -> bool:
    if payload is None:
        return False
    focus = payload.get("focusMenus")
    return isinstance(focus, list) and len(focus) >= 2


async def _fetch_daily_hour_range(
    client: httpx.AsyncClient,
    *,
    location_id: int,
    user_id: str,
) -> tuple[int, int]:
    data = await graphql_post(
        client,
        LOCATION_QUERY,
        {"id": str(location_id)},
        user_id,
    )
    loc = data.get("location")
    if not isinstance(loc, dict):
        return _DEFAULT_DAILY_START_HOUR, _DEFAULT_DAILY_END_HOUR
    hours = loc.get("openingHours")
    if not isinstance(hours, list):
        return _DEFAULT_DAILY_START_HOUR, _DEFAULT_DAILY_END_HOUR
    return derive_daily_heatmap_hour_range([h for h in hours if isinstance(h, dict)])


async def load_chart_data_markdown(
    client: httpx.AsyncClient,
    *,
    chart_id: ChartId,
    location_id: int,
    user_id: str,
    analytics_run_id: int | str | None = None,
) -> str:
    """Load chart analytics with preferred-run then location fallback; return markdown."""
    preferred = (
        str(analytics_run_id)
        if analytics_run_id is not None and str(analytics_run_id).strip()
        else None
    )

    async def try_run(run_id: str) -> dict[str, Any] | None:
        if chart_id == "venue_slot_strength_heatmap":
            cells = await _fetch_slot_demand(client, analytics_run_id=run_id, user_id=user_id)
            if not cells:
                return None
            return {"slotDemandProfile": cells}
        if chart_id == "menu_item_heatmap":
            items = await _fetch_menu_heatmaps(
                client,
                analytics_run_id=run_id,
                location_id=location_id,
                user_id=user_id,
            )
            if not items:
                return None
            matrix_items = await _fetch_menu_engineering_matrix_items(
                client,
                analytics_run_id=run_id,
                location_id=location_id,
                user_id=user_id,
            )
            filtered, category_map, applied = filter_heatmaps_for_chat(items, matrix_items)
            start, end = await _fetch_daily_hour_range(
                client, location_id=location_id, user_id=user_id
            )
            return {
                "menuHeatmaps": filtered,
                "dailyStartHour": start,
                "dailyEndHour": end,
                "matrixCategoryByMenu": category_map,
                "matrixFilterApplied": applied,
            }
        lift = await _fetch_pair_lift(
            client,
            analytics_run_id=run_id,
            location_id=location_id,
            user_id=user_id,
        )
        if not _has_lift_matrix_data(lift):
            return None
        assert lift is not None
        return lift

    used_fallback = False
    payload: dict[str, Any] | None = None

    if preferred is not None:
        payload = await try_run(preferred)

    if payload is None:
        run_ids = await _list_analytics_run_ids(client, location_id=location_id, user_id=user_id)
        for run_id in run_ids:
            if run_id == preferred:
                continue
            payload = await try_run(run_id)
            if payload is not None:
                used_fallback = preferred is not None
                break

    if payload is None:
        empty: dict[str, Any]
        if chart_id == "venue_slot_strength_heatmap":
            empty = {"slotDemandProfile": []}
        elif chart_id == "menu_item_heatmap":
            empty = {"menuHeatmaps": []}
        else:
            empty = {"focusMenus": [], "matrixLift": []}
        return format_chart_markdown_section(
            chart_id=chart_id,
            payload=empty,
            used_fallback_run=False,
        )

    return format_chart_markdown_section(
        chart_id=chart_id,
        payload=payload,
        used_fallback_run=used_fallback,
    )
