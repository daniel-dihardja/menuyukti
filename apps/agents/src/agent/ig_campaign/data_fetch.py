"""Planning node: single-query fetch of location, operating profile, and menu matrix."""

import logging
from typing import Any

from langchain_core.runnables import RunnableConfig

from agent.gql_client import fetch_campaign_data
from agent.ig_campaign.node_utils import _emit, _update_planning
from agent.state import State

logger = logging.getLogger(__name__)

_PROMOTION_CATEGORIES = ["star", "plow_horse", "puzzle"]
_CATEGORY_BREAKDOWN_CATEGORIES = {"star", "plow_horse"}


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
    """Fetch location, operating profile, and menu matrix concurrently.

    Public holidays are pre-fetched by the web app and seeded into planning state
    via initialize_session — no holiday lookup happens here.
    """
    await _emit("fetch_all_data", "running", "Fetching restaurant data...", config)

    configurable = config.get("configurable") or {}
    location_id = configurable.get("location_id")
    analytics_id = configurable.get("analytics_id")

    planning = state.planning

    location: dict[str, Any] = {}
    profile: dict[str, Any] | None = None
    items: list[dict[str, Any]] | None = None

    if location_id is not None and analytics_id is not None:
        try:
            location, profile, items = await fetch_campaign_data(location_id, analytics_id, _PROMOTION_CATEGORIES)
        except Exception:
            logger.exception(
                "Failed to fetch campaign data for location_id=%s analytics_id=%s",
                location_id, analytics_id,
            )

    if profile and items:
        breakdown_items = [i for i in items if i.get("category") in _CATEGORY_BREAKDOWN_CATEGORIES]
        profile = {**profile, **_compute_category_breakdown(breakdown_items)}

    parts: list[str] = []
    if location:
        parts.append(location.get("name") or "location found")
    if profile:
        parts.append(f"pattern: {profile.get('operatingPattern', 'N/A')}")
    if items:
        parts.append(f"{len(items)} promotion candidate(s)")
        breakdown_count = sum(1 for i in items if i.get("category") in _CATEGORY_BREAKDOWN_CATEGORIES)
        parts.append(f"{breakdown_count} menu item(s) analysed")
    await _emit("fetch_all_data", "done", " · ".join(parts) if parts else "No data available", config)

    return {"planning": _update_planning(
        planning,
        location=location,
        operatingProfile=profile,
        promotionItems=items,
    )}
