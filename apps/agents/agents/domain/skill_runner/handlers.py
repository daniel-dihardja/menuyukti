"""Registered prefetch handlers for skill `use:` ids."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.domain.skill_runner.graphql_client import (
    fetch_latest_analytics_run_id,
    fetch_location_dict,
    fetch_operating_profile_dict,
    fetch_public_holidays_list,
)

PrefetchHandler = Any  # async (inputs: dict[str, object], *, client, user_id) -> Any


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
) -> list[dict[str, Any]]:
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


async def _handle_location(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
) -> dict[str, Any] | None:
    location_id = _coerce_location_id(inputs["location_id"])
    return await fetch_location_dict(location_id, user_id, client=client)


async def _handle_latest_operating_profile(
    inputs: dict[str, object],
    *,
    client: httpx.AsyncClient,
    user_id: str,
) -> dict[str, Any] | None:
    location_id = _coerce_location_id(inputs["location_id"])
    run_id = await fetch_latest_analytics_run_id(location_id, user_id, client=client)
    if not run_id:
        msg = "No analytics run found for this location. Upload sales data first."
        raise RuntimeError(msg)
    profile = await fetch_operating_profile_dict(location_id, run_id, user_id, client=client)
    if not profile:
        msg = "Could not load operating profile for the latest analytics run."
        raise RuntimeError(msg)
    return profile


PREFETCH_HANDLERS: dict[str, PrefetchHandler] = {
    "platform.location": _handle_location,
    "platform.public_holidays": _handle_public_holidays,
    "analytics.latest_operating_profile": _handle_latest_operating_profile,
}
