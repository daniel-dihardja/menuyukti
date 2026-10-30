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
from agents_app.agents.core.chat.sanitize_tool_errors import sanitize_tool_error_message
from agents_app.agents.core.chat.untrusted_context import wrap_untrusted
from agents_app.agents.core.location_page_format import format_location_page_markdown
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    LOCATION_ADVISOR_MEMORY_QUERY,
    LOCATION_QUERY,
    SEARCH_KNOWLEDGE_QUERY,
    UPDATE_LOCATION_ADVISOR_MEMORY_MUTATION,
)
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
    """Load location-page data for the venue: basics, opening hours, owner quick profile.

    Call when the user asks about venue hours, address, cuisine, contact links, or other
    location settings — and before timing-sensitive advice or an owner-requested plan so
    days and times respect opening hours."""
    c = (config or {}).get("configurable") or {}
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    if location_id is None or not user_id:
        return (
            "Location context is not available (missing location). "
            "Open advisor chat with a linked location."
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
        return sanitize_tool_error_message("get_location_data", exc)
    raw_loc = loc_data.get("location")
    if not isinstance(raw_loc, dict):
        return "Location not found or access denied."
    return format_location_page_markdown(raw_loc)


@tool
async def get_advisor_memory(
    config: Annotated[RunnableConfig, InjectedToolArg()],
) -> str:
    """Load durable advisor memory for the current venue across chat threads.

    Call for location situation briefs / venue-scoped advice (first load in the
    thread), when the user asks what you remember, or before timing-sensitive advice
    or an owner-requested plan if preferences may apply. Skip when only owner
    location-page facts are needed (use ``get_location_data``), or when a successful
    result is already in this thread unless the user asks to refresh. Memory holds
    preferences, constraints, and outcomes — never invent sales figures from it.
    """
    c = (config or {}).get("configurable") or {}
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    if location_id is None or not user_id:
        return (
            "Location context is not available (missing location). "
            "Open advisor chat with a linked location."
        )
    client = get_chat_http_client()
    try:
        data = await graphql_post(
            client,
            LOCATION_ADVISOR_MEMORY_QUERY,
            {"id": str(location_id)},
            str(user_id),
        )
    except Exception as exc:  # noqa: BLE001 — return to model; do not crash the ReAct turn
        return sanitize_tool_error_message("get_advisor_memory", exc)
    raw_loc = data.get("location")
    if not isinstance(raw_loc, dict):
        return "Location not found or access denied."
    memory = raw_loc.get("advisorMemory")
    if not isinstance(memory, dict):
        return wrap_untrusted(
            "advisor_memory",
            "Advisor memory is empty for this location.",
        )
    content = memory.get("content")
    text = content.strip() if isinstance(content, str) else ""
    if not text:
        return wrap_untrusted(
            "advisor_memory",
            "Advisor memory is empty for this location.",
        )
    updated = memory.get("updatedAt")
    header = "Advisor memory for this location"
    if isinstance(updated, str) and updated.strip():
        header = f"{header} (updated {updated.strip()})"
    body = f"{header}:\n\n{text}"
    return wrap_untrusted("advisor_memory", body)


@tool
async def update_advisor_memory(
    content: str,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Replace durable advisor memory for the current venue.

    Pass a concise summary of durable preferences, constraints, or outcomes.
    Pass an empty string to clear memory. Do not write owner quickProfile fields
    or invent sales figures.
    """
    c = (config or {}).get("configurable") or {}
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    if location_id is None or not user_id:
        return (
            "Location context is not available (missing location). "
            "Open advisor chat with a linked location."
        )
    if not isinstance(content, str):
        return "content must be a string (use empty string to clear)."
    text = content.strip()
    client = get_chat_http_client()
    try:
        data = await graphql_post(
            client,
            UPDATE_LOCATION_ADVISOR_MEMORY_MUTATION,
            {"locationId": int(location_id), "content": text},
            str(user_id),
        )
    except Exception as exc:  # noqa: BLE001 — return to model; do not crash the ReAct turn
        return sanitize_tool_error_message("update_advisor_memory", exc)
    payload = data.get("updateLocationAdvisorMemory")
    if not isinstance(payload, dict):
        return "Failed to update advisor memory."
    saved = payload.get("content")
    saved_text = saved.strip() if isinstance(saved, str) else ""
    if not saved_text:
        return "Advisor memory cleared for this location."
    return (
        f"Advisor memory updated for this location ({len(saved_text)} characters). "
        "It will be available in future chat threads for this venue."
    )


@tool
async def get_chart_data(
    chart_id: Literal[
        "venue_slot_strength_heatmap",
        "menu_item_heatmap",
        "pair_lift_matrix_heatmap",
        "weak_review",
    ],
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Load analytics data for a visualization chart (marketing timing and menu ops).

    - ``venue_slot_strength_heatmap``: posting frequency and best timing (``schedule``).
    - ``menu_item_heatmap``: which menus to feature, with timing context.
    - ``pair_lift_matrix_heatmap``: interesting menu combos / co-purchase pairings.
    - ``weak_review``: Weak items review — low-popularity, low-margin items to reprice,
      improve, or remove.

    Pass a chart_id from the chart catalog exactly — do not invent ids.
    """
    c = (config or {}).get("configurable") or {}
    location_id = c.get("location_id")
    user_id = c.get("user_id")
    analytics_run_id = c.get("analytics_run_id")
    if location_id is None or not user_id:
        return (
            "Location context is not available (missing location). "
            "Open advisor chat with a linked location."
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
        return sanitize_tool_error_message("get_chart_data", exc)


@tool
async def search_knowledge(
    query: str,
    categories: list[str] | None = None,
    chart_ids: list[str] | None = None,
    limit: int = 6,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Search domain knowledge, KPI definitions, and recommendation playbooks.

    Call when explaining what a KPI/chart means, interpreting metrics, or loading
    playbook actions. Pass ``chart_ids`` when the question is about a catalog chart.
    Skip when numbers are already in ``get_chart_data`` / Visualization data, for
    pure copy/media turns, or when a relevant hit is already in this thread.
    Never invent venue sales figures from knowledge alone. Optional ``categories``:
    domain, kpi, playbook.
    """
    user_id = _user_id_from_config(config)
    if not user_id:
        return "User context is missing. Cannot search knowledge."
    q = (query or "").strip()
    if not q:
        return "Provide a non-empty query for knowledge search."
    c = (config or {}).get("configurable") or {}
    location_id = c.get("location_id")
    vars: dict = {
        "query": q,
        "limit": max(1, min(int(limit or 6), 20)),
    }
    if categories:
        vars["categories"] = [str(x).strip().lower() for x in categories if str(x).strip()]
    if chart_ids:
        vars["chartIds"] = [str(x).strip() for x in chart_ids if str(x).strip()]
    if isinstance(location_id, int):
        vars["locationId"] = location_id
    elif isinstance(location_id, str) and location_id.strip().isdigit():
        vars["locationId"] = int(location_id.strip())

    client = get_chat_http_client()
    try:
        data = await graphql_post(client, SEARCH_KNOWLEDGE_QUERY, vars, user_id)
    except Exception as exc:  # noqa: BLE001
        return sanitize_tool_error_message("search_knowledge", exc)
    rows = data.get("searchKnowledge")
    if not isinstance(rows, list) or not rows:
        return "No relevant knowledge chunks found."
    lines = [f"Knowledge hits ({len(rows)}):"]
    for row in rows:
        if not isinstance(row, dict):
            continue
        title = row.get("title") or row.get("slug") or "untitled"
        category = row.get("category") or ""
        score = row.get("score")
        content = (row.get("content") or "").strip()
        score_s = f"{float(score):.3f}" if isinstance(score, (int, float)) else "?"
        lines.append(f"### {title} ({category}, score={score_s})")
        lines.append(content)
        lines.append("")
    return wrap_untrusted("knowledge", "\n".join(lines).rstrip()) + "\n"


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
        return sanitize_tool_error_message("list_media_collections", exc)
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
        return sanitize_tool_error_message("list_media", exc)
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
