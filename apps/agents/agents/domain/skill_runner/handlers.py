"""Registered prefetch handlers for skill `use:` ids."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

import httpx
from agents_app.agents.domain.skill_runner.graphql_client import (
    fetch_category_mix_dict,
    fetch_instagram_signals_dict,
    fetch_location_dict,
    fetch_location_social_settings_dict,
    fetch_menu_items_catalog_dict,
    fetch_most_recent_milestone_data_str,
    fetch_operating_profile_dict,
    fetch_prior_milestones_ordered_str,
    fetch_promotion_menu_items_dict,
    fetch_public_holidays_list,
    fetch_revenue_trends_dict,
    fetch_weekly_demand_pattern_dict,
    get_or_fetch_latest_analytics_run_id,
)

PrefetchHandler = Callable[..., Awaitable[Any]]


def _coerce_location_id(raw: object) -> int:
    if isinstance(raw, int):
        return raw
    return int(str(raw))


def _coerce_required_str(inputs: dict[str, object], key: str) -> str:
    raw = inputs.get(key)
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        msg = f"Missing or empty required input: {key}"
        raise RuntimeError(msg)
    return str(raw).strip()


async def _handle_public_holidays(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> list[dict[str, Any]]:
    _ = prefetch_cache
    country = _coerce_required_str(inputs, "country")
    start_date = _coerce_required_str(inputs, "start_date")
    end_date = _coerce_required_str(inputs, "end_date")
    if start_date > end_date:
        msg = "start_date must be on or before end_date"
        raise RuntimeError(msg)
    return await fetch_public_holidays_list(
        country,
        start_date,
        end_date,
        user_id,
        client=client,
    )


async def _handle_public_holidays_for_location(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> list[dict[str, Any]]:
    """Resolve country from platform.location, then fetch holidays (empty list if no country)."""
    _ = prefetch_cache
    location_id = _coerce_location_id(inputs["location_id"])
    start_date = _coerce_required_str(inputs, "start_date")
    end_date = _coerce_required_str(inputs, "end_date")
    if start_date > end_date:
        msg = "start_date must be on or before end_date"
        raise RuntimeError(msg)
    loc = await fetch_location_dict(location_id, user_id, client=client)
    if not loc:
        return []
    country = loc.get("country")
    if not country or not str(country).strip():
        return []
    return await fetch_public_holidays_list(
        str(country).strip(),
        start_date,
        end_date,
        user_id,
        client=client,
    )


async def _handle_location(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> dict[str, Any] | None:
    _ = prefetch_cache
    location_id = _coerce_location_id(inputs["location_id"])
    return await fetch_location_dict(location_id, user_id, client=client)


async def _handle_latest_operating_profile(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> dict[str, Any] | None:
    location_id = _coerce_location_id(inputs["location_id"])
    run_id = await get_or_fetch_latest_analytics_run_id(
        location_id,
        user_id,
        client=client,
        prefetch_cache=prefetch_cache,
    )
    if not run_id:
        msg = "No analytics run found for this location. Upload sales data first."
        raise RuntimeError(msg)
    profile = await fetch_operating_profile_dict(location_id, run_id, user_id, client=client)
    if not profile:
        msg = "Could not load operating profile for the latest analytics run."
        raise RuntimeError(msg)
    return profile


async def _handle_instagram_signals(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> dict[str, Any] | None:
    location_id = _coerce_location_id(inputs["location_id"])
    run_id = await get_or_fetch_latest_analytics_run_id(
        location_id,
        user_id,
        client=client,
        prefetch_cache=prefetch_cache,
    )
    if not run_id:
        msg = "No analytics run found for this location. Upload sales data first."
        raise RuntimeError(msg)
    payload = await fetch_instagram_signals_dict(location_id, run_id, user_id, client=client)
    if not payload:
        msg = "Could not load Instagram signals (no order data for the latest analytics run)."
        raise RuntimeError(msg)
    return payload


async def _handle_promotion_menu_items(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> dict[str, Any] | None:
    location_id = _coerce_location_id(inputs["location_id"])
    run_id = await get_or_fetch_latest_analytics_run_id(
        location_id,
        user_id,
        client=client,
        prefetch_cache=prefetch_cache,
    )
    if not run_id:
        msg = "No analytics run found for this location. Upload sales data first."
        raise RuntimeError(msg)
    payload = await fetch_promotion_menu_items_dict(location_id, run_id, user_id, client=client)
    if not payload:
        msg = "Could not load promotion menu items for the latest analytics run."
        raise RuntimeError(msg)
    return payload


async def _handle_category_mix(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> dict[str, Any] | None:
    location_id = _coerce_location_id(inputs["location_id"])
    run_id = await get_or_fetch_latest_analytics_run_id(
        location_id,
        user_id,
        client=client,
        prefetch_cache=prefetch_cache,
    )
    if not run_id:
        msg = "No analytics run found for this location. Upload sales data first."
        raise RuntimeError(msg)
    payload = await fetch_category_mix_dict(location_id, run_id, user_id, client=client)
    if not payload:
        msg = "Could not load category mix (no order data for the latest analytics run)."
        raise RuntimeError(msg)
    return payload


async def _handle_revenue_trends(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> dict[str, Any] | None:
    location_id = _coerce_location_id(inputs["location_id"])
    run_id = await get_or_fetch_latest_analytics_run_id(
        location_id,
        user_id,
        client=client,
        prefetch_cache=prefetch_cache,
    )
    if not run_id:
        msg = "No analytics run found for this location. Upload sales data first."
        raise RuntimeError(msg)
    payload = await fetch_revenue_trends_dict(location_id, run_id, user_id, client=client)
    if not payload:
        msg = "Could not load revenue trends (no order data for the latest analytics run)."
        raise RuntimeError(msg)
    return payload


async def _handle_menu_items_catalog(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> dict[str, Any] | None:
    _ = prefetch_cache
    location_id = _coerce_location_id(inputs["location_id"])
    payload = await fetch_menu_items_catalog_dict(location_id, user_id, client=client)
    if not payload:
        msg = "Could not load menu catalog (no order data for the latest analytics run)."
        raise RuntimeError(msg)
    return payload


async def _handle_weekly_demand_pattern(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> dict[str, Any] | None:
    _ = prefetch_cache
    location_id = _coerce_location_id(inputs["location_id"])
    payload = await fetch_weekly_demand_pattern_dict(location_id, user_id, client=client)
    if not payload:
        msg = "Could not load weekly demand pattern (no order data for the latest analytics run)."
        raise RuntimeError(msg)
    return payload


async def _handle_location_social_settings(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> dict[str, Any] | None:
    _ = prefetch_cache
    location_id = _coerce_location_id(inputs["location_id"])
    return await fetch_location_social_settings_dict(location_id, user_id, client=client)


async def _handle_prior_milestone_data(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> str | None:
    _ = prefetch_cache
    raw_wf = inputs.get("workflow_id")
    if raw_wf is None or (isinstance(raw_wf, str) and not str(raw_wf).strip()):
        return None
    data_task = _coerce_required_str(inputs, "data_task")
    return await fetch_most_recent_milestone_data_str(
        str(raw_wf).strip(),
        data_task,
        user_id,
        client=client,
    )


async def _handle_prior_milestones_ordered(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
    prefetch_cache: dict[int, str | None] | None = None,
) -> str:
    """Ordered prior milestone Data tabs (e.g. Dates) for the current Prepare milestone."""
    _ = prefetch_cache
    raw_wf = inputs.get("workflow_id")
    raw_ms = inputs.get("milestone_id")
    if raw_wf is None or (isinstance(raw_wf, str) and not str(raw_wf).strip()):
        return ""
    if raw_ms is None or (isinstance(raw_ms, str) and not str(raw_ms).strip()):
        return ""
    location_id = _coerce_location_id(inputs["location_id"])
    return await fetch_prior_milestones_ordered_str(
        str(raw_wf).strip(),
        str(raw_ms).strip(),
        location_id,
        user_id,
        client=client,
    )


PREFETCH_HANDLERS: dict[str, PrefetchHandler] = {
    "platform.location": _handle_location,
    "platform.public_holidays": _handle_public_holidays,
    "platform.public_holidays_for_location": _handle_public_holidays_for_location,
    "analytics.latest_operating_profile": _handle_latest_operating_profile,
    "analytics.instagram_signals": _handle_instagram_signals,
    "analytics.promotion_menu_items": _handle_promotion_menu_items,
    "analytics.category_mix": _handle_category_mix,
    "analytics.revenue_trends": _handle_revenue_trends,
    "platform.menu_items": _handle_menu_items_catalog,
    "analytics.weekly_demand_pattern": _handle_weekly_demand_pattern,
    "platform.location_social_settings": _handle_location_social_settings,
    "milestone.prior_data": _handle_prior_milestone_data,
    "milestone.prior_milestones_ordered": _handle_prior_milestones_ordered,
}
