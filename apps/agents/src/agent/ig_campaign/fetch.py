"""Planning node: parallel fetch of location, operating profile, and menu matrix."""

import asyncio
import logging
from typing import Any

from langchain_core.runnables import RunnableConfig

from agent.gql_client import (
    fetch_location,
    fetch_menu_category_items,
    fetch_menu_engineering_matrix,
    fetch_operating_profile,
)
from agent.ig_campaign.utils import _emit, _update_planning
from agent.state import State

logger = logging.getLogger(__name__)

_PROMOTION_CATEGORIES = ["star", "puzzle"]
_CATEGORY_BREAKDOWN_CATEGORIES = ["star", "plow_horse"]


def _compute_category_breakdown(items: list[dict]) -> dict:
    """Aggregate menu items by menuCategory and menuCategoryDetail into share breakdowns."""
    from collections import defaultdict

    cat_totals: dict[str, dict] = defaultdict(lambda: {"quantity": 0, "revenue": 0.0})
    detail_totals: dict[str, dict] = defaultdict(
        lambda: {"quantity": 0, "revenue": 0.0, "menuCategory": ""}
    )

    total_qty = sum(i.get("quantity") or 0 for i in items)
    total_rev = sum(i.get("totalRevenue") or 0.0 for i in items)

    for item in items:
        cat = item.get("menuCategory") or "UNKNOWN"
        det = item.get("menuCategoryDetail") or "UNKNOWN"
        qty = item.get("quantity") or 0
        rev = item.get("totalRevenue") or 0.0

        cat_totals[cat]["quantity"] += qty
        cat_totals[cat]["revenue"] += rev
        detail_totals[det]["quantity"] += qty
        detail_totals[det]["revenue"] += rev
        detail_totals[det]["menuCategory"] = cat

    return {
        "menuCategoryBreakdown": [
            {
                "category": k,
                "quantityShare": v["quantity"] / total_qty if total_qty else 0.0,
                "revenueShare": v["revenue"] / total_rev if total_rev else 0.0,
            }
            for k, v in sorted(cat_totals.items(), key=lambda x: -x[1]["quantity"])
        ],
        "menuCategoryDetailBreakdown": [
            {
                "detail": k,
                "menuCategory": v["menuCategory"],
                "quantityShare": v["quantity"] / total_qty if total_qty else 0.0,
                "revenueShare": v["revenue"] / total_rev if total_rev else 0.0,
            }
            for k, v in sorted(detail_totals.items(), key=lambda x: -x[1]["quantity"])
        ],
    }


async def fetch_all_data(state: State, config: RunnableConfig) -> dict[str, Any]:
    """Fetch location, operating profile, and menu matrix in parallel via asyncio.gather."""
    await _emit("fetch_all_data", "running", "Fetching restaurant data...", config)

    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    analytics_id = configurable.get("analytics_id")

    async def _fetch_location() -> dict[str, Any]:
        if location_id is None:
            return {}
        try:
            return await fetch_location(location_id)
        except Exception:
            logger.exception("Failed to fetch location for id=%s", location_id)
            return {}

    async def _fetch_profile() -> dict[str, Any] | None:
        if location_id is None or analytics_id is None:
            return None
        try:
            return await fetch_operating_profile(location_id, analytics_id)
        except Exception:
            logger.exception(
                "Failed to fetch operating profile for location_id=%s analytics_id=%s",
                location_id,
                analytics_id,
            )
            return None

    async def _fetch_menu_matrix() -> list[dict[str, Any]] | None:
        if analytics_id is None:
            return None
        try:
            matrix = await fetch_menu_engineering_matrix(analytics_id, _PROMOTION_CATEGORIES)
            return matrix.get("items") or None
        except Exception:
            logger.exception(
                "Failed to fetch menu matrix for analytics_id=%s", analytics_id
            )
            return None

    async def _fetch_all_menu_items() -> list[dict[str, Any]] | None:
        if analytics_id is None:
            return None
        try:
            items = await fetch_menu_category_items(analytics_id, _CATEGORY_BREAKDOWN_CATEGORIES)
            return items or None
        except Exception:
            logger.exception(
                "Failed to fetch all menu items for analytics_id=%s", analytics_id
            )
            return None

    location, profile, items, all_menu_items = await asyncio.gather(
        _fetch_location(),
        _fetch_profile(),
        _fetch_menu_matrix(),
        _fetch_all_menu_items(),
    )

    if profile and all_menu_items:
        profile = {**profile, **_compute_category_breakdown(all_menu_items)}

    parts: list[str] = []
    if location:
        parts.append(location.get("name") or "location found")
    if profile:
        parts.append(f"pattern: {profile.get('operatingPattern', 'N/A')}")
    if items:
        parts.append(f"{len(items)} promotion candidate(s)")
    if all_menu_items:
        parts.append(f"{len(all_menu_items)} menu item(s) analysed")
    await _emit("fetch_all_data", "done", " · ".join(parts) if parts else "No data available", config)

    planning = state.planning
    return {"planning": _update_planning(
        planning, location=location, operatingProfile=profile, promotionItems=items
    )}
