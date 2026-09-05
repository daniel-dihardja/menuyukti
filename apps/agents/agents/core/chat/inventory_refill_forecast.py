"""Inventar refill forecast chat tool."""

from __future__ import annotations

import json
from typing import Annotated

from agents_app.agents.core.chat.http_context import get_chat_http_client
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import INVENTORY_REFILL_FORECAST_QUERY
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolArg, tool


@tool
async def get_inventory_refill_forecast(
    window_days: int = 14,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Load ranked inventar refill priorities for the current location.

    Call when the user asks what to refill, reorder, or restock first, how many days
    of stock remain, or which pantry items are running low. Uses deterministic burn-rate
    math from recent out / transfer_out movements — do not invent burn rates.

    Optional ``window_days`` (clamped server-side, default 14) sets the lookback window.
    """
    c = (config or {}).get("configurable") or {}
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    if location_id is None or not user_id:
        return (
            "Location context is not available (missing location). "
            "Open inventar chat with a selected branch."
        )

    days = int(window_days) if isinstance(window_days, (int, float)) else 14
    client = get_chat_http_client()
    try:
        data = await graphql_post(
            client,
            INVENTORY_REFILL_FORECAST_QUERY,
            {"locationId": str(location_id), "windowDays": days},
            str(user_id),
        )
    except Exception as exc:  # noqa: BLE001 — return to model; do not crash the ReAct turn
        return f"Error loading inventar refill forecast: {exc}"

    rows = data.get("inventoryRefillForecast")
    if not isinstance(rows, list):
        return "Inventar refill forecast unavailable or access denied."
    if not rows:
        return "No stock rows at this location — nothing to forecast."

    # Compact JSON for the model (stable field names matching GraphQL).
    return json.dumps(rows, ensure_ascii=False, indent=2)
