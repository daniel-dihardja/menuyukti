"""LangChain tools for chat assistant (location, charts, media)."""

from __future__ import annotations

from typing import Annotated, Literal

from agents_app.agents.core.chat.chart_data import (
    CHART_IDS,
    is_chart_id,
    load_chart_data_markdown,
)
from agents_app.agents.core.chat.http_context import get_chat_http_client
from agents_app.agents.core.chat.media_collections_client import (
    list_media_assets as fetch_media_assets,
)
from agents_app.agents.core.chat.media_collections_client import (
    list_media_collections as fetch_media_collections,
)
from agents_app.agents.core.location_page_format import format_location_page_markdown
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import LOCATION_QUERY
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolArg, tool


def _user_id_from_config(config: RunnableConfig | None) -> str | None:
    c = (config or {}).get("configurable") or {}
    user_id = c.get("user_id")
    if not isinstance(user_id, str) or not user_id.strip():
        return None
    return user_id.strip()


@tool
async def get_location_data(config: Annotated[RunnableConfig, InjectedToolArg()]) -> str:
    """Load location-page data for the campaign venue: basics, opening hours, owner quick profile.

    Call when the user asks about venue hours, address, cuisine, contact links, or other
    location settings — and before proposing a weekly Instagram schedule so posting days
    and times respect opening hours."""
    c = (config or {}).get("configurable") or {}
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    if location_id is None or not user_id:
        return (
            "Location context is not available (missing location). "
            "Open workflow chat for a campaign with a linked location."
        )
    client = get_chat_http_client()
    try:
        loc_data = await graphql_post(
            client,
            LOCATION_QUERY,
            {"id": str(location_id)},
            str(user_id),
        )
    except Exception as exc:  # noqa: BLE001 — return to model; do not crash the ReAct turn
        return f"Error loading location data: {exc}"
    raw_loc = loc_data.get("location")
    if not isinstance(raw_loc, dict):
        return "Location not found or access denied."
    return format_location_page_markdown(raw_loc)


@tool
async def get_chart_data(
    chart_id: Literal[
        "venue_slot_strength_heatmap",
        "menu_item_heatmap",
        "pair_lift_matrix_heatmap",
    ],
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Load analytics data for a workflow visualization chart (main Instagram planning sources).

    - ``venue_slot_strength_heatmap``: posting frequency and best timing (``schedule``).
    - ``menu_item_heatmap``: which menus to feature, with timing context.
    - ``pair_lift_matrix_heatmap``: interesting menu combos / co-purchase pairings.

    Pass a chart_id from the workflow chart catalog exactly — do not invent ids.
    """
    c = (config or {}).get("configurable") or {}
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    analytics_run_id = c.get("analytics_run_id")
    if location_id is None or not user_id:
        return (
            "Location context is not available (missing location). "
            "Open workflow chat for a campaign with a linked location."
        )
    if not is_chart_id(chart_id):
        allowed = ", ".join(CHART_IDS)
        return f"Unknown chart_id {chart_id!r}. Allowed values: {allowed}."

    client = get_chat_http_client()
    try:
        return await load_chart_data_markdown(
            client,
            chart_id=chart_id,
            location_id=int(location_id),
            user_id=str(user_id),
            analytics_run_id=analytics_run_id,
        )
    except Exception as exc:  # noqa: BLE001 — return to model; do not crash the ReAct turn
        return f"Error loading chart data for {chart_id}: {exc}"


@tool
async def list_media_collections(
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """List workspace media collections (named groups of library photos).

    Call when the user asks which collections exist, or before listing photos in a
    specific collection via ``list_media``. Returns id, name, and member count.
    """
    user_id = _user_id_from_config(config)
    if not user_id:
        return "User context is missing. Cannot list media collections."
    client = get_chat_http_client()
    try:
        rows = await fetch_media_collections(user_id, client=client)
    except Exception as exc:  # noqa: BLE001 — return to model; do not crash the ReAct turn
        return f"Error listing media collections: {exc}"
    if not rows:
        return "No media collections in this workspace."
    lines = [f"Media collections ({len(rows)}):"]
    for row in rows:
        cid = row.get("id")
        name = row.get("name") or "(unnamed)"
        count = row.get("memberCount", 0)
        lines.append(f"- id={cid} name={name!r} members={count}")
    return "\n".join(lines)


@tool
async def list_media(
    collection_id: int | None = None,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """List workspace media library photos (filenames).

    Omit ``collection_id`` to list all cataloged photos. Pass a collection id from
    ``list_media_collections`` to list only photos in that collection. Do not invent
    filenames — use this tool (or user @ mentions) for real library files.
    """
    user_id = _user_id_from_config(config)
    if not user_id:
        return "User context is missing. Cannot list media."
    if collection_id is not None and (not isinstance(collection_id, int) or collection_id <= 0):
        return "collection_id must be a positive integer when provided."
    client = get_chat_http_client()
    try:
        rows = await fetch_media_assets(user_id, collection_id=collection_id, client=client)
    except Exception as exc:  # noqa: BLE001 — return to model; do not crash the ReAct turn
        return f"Error listing media: {exc}"
    scope = (
        f"collection id={collection_id}" if collection_id is not None else "all cataloged photos"
    )
    if not rows:
        return f"No media assets for {scope}."
    lines = [f"Media assets ({scope}, {len(rows)}):"]
    for row in rows:
        filename = row.get("filename") or ""
        display = row.get("displayName")
        if display:
            lines.append(f"- {filename} (displayName={display!r})")
        else:
            lines.append(f"- {filename}")
    return "\n".join(lines)
