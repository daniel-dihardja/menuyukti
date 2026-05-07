"""GraphQL helpers for milestone run tools: upsert data + re-exports from milestone eval."""

from __future__ import annotations

import json
import logging
from copy import deepcopy
from typing import Any

import httpx
from agents_app.agents.core.milestone_data.graphql_client import upsert_milestonedata
from agents_app.agents.core.milestone_eval.graphql_client import (
    create_result_node,
    delete_node,
    fetch_milestone_children,
    update_passcriteria_status,
)
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    ANALYTICS_RUNS_QUERY,
    API_ADAPTER_TOOLS_QUERY,
    CAMPAIGN_SCHEDULE_PLAN_QUERY,
    LOCATION_OPERATING_SIGNALS_QUERY,
    LOCATION_QUERY,
    PROMOTION_ENGINEERING_CANDIDATES_QUERY,
    PRIOR_MILESTONES_MILESTONE_DATA_QUERY,
    PUBLIC_HOLIDAYS_QUERY,
)

_logger = logging.getLogger(__name__)


async def fetch_api_adapter_tools_for_location(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[dict[str, Any]]:
    """Active workspace API adapter tools for this location (empty if no workspace)."""
    data = await graphql_post(
        client,
        LOCATION_QUERY,
        {"id": str(location_id), "locationId": location_id},
        user_id,
    )
    raw = data.get("location")
    if not isinstance(raw, dict):
        return []
    wid = raw.get("workspaceId")
    if wid is None or str(wid).strip() == "":
        return []

    data2 = await graphql_post(
        client,
        API_ADAPTER_TOOLS_QUERY,
        {"workspaceId": str(wid)},
        user_id,
    )
    tools = data2.get("apiAdapterTools")
    if not isinstance(tools, list):
        return []

    out: list[dict[str, Any]] = []
    for row in tools:
        if not isinstance(row, dict):
            continue
        if not row.get("isActive", True):
            continue
        key = row.get("toolKey")
        url = row.get("url")
        desc = row.get("description")
        if not isinstance(key, str) or not key.strip():
            continue
        if not isinstance(url, str) or not url.strip():
            continue
        out.append(
            {
                "tool_key": key.strip(),
                "url": url.strip(),
                "description": desc.strip() if isinstance(desc, str) else "",
            }
        )
    return out


async def fetch_prior_milestones_data(
    milestone_id: str,
    workflow_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> str:
    """Fetch JSON text listing each earlier milestone's milestonedata (title + raw data payload).

    Resolved in a single GraphQL round-trip via ``priorMilestonesMilestoneData`` (JSON scalar);
    returned as pretty-printed JSON text for LangGraph state and tools.
    """
    data = await graphql_post(
        client,
        PRIOR_MILESTONES_MILESTONE_DATA_QUERY,
        {
            "workflowId": workflow_id,
            "milestoneId": milestone_id,
            "locationId": location_id,
        },
        user_id,
    )
    raw = data.get("priorMilestonesMilestoneData")
    if isinstance(raw, (list, dict)):
        return json.dumps(raw, ensure_ascii=False, indent=2).strip()
    if isinstance(raw, str):
        return raw.strip()
    return ""


async def fetch_public_holidays_for_milestone(
    location_id: int,
    start_date: str,
    end_date: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> tuple[list[dict[str, Any]], str | None]:
    """Resolve country from location then fetch public holidays.

    ``start_date`` and ``end_date`` are inclusive YYYY-MM-DD strings.

    Returns ``(holidays, error)``. ``error`` is set when the range is invalid, the location is
    missing, or the location has no country; otherwise ``error`` is ``None`` and ``holidays`` may
    be empty when there are no holidays in range.
    """
    sd = start_date.strip()
    ed = end_date.strip()
    if not sd or not ed or sd > ed:
        return (
            [],
            "Invalid date range: start and end must be YYYY-MM-DD with start on or before end.",
        )

    data = await graphql_post(
        client,
        LOCATION_QUERY,
        {"id": str(location_id), "locationId": location_id},
        user_id,
    )
    raw = data.get("location")
    if raw is None or not isinstance(raw, dict):
        return [], "Location not found."
    country = raw.get("country")
    if not country or not str(country).strip():
        return [], "No public holiday data available for this location (country not set)."

    data = await graphql_post(
        client,
        PUBLIC_HOLIDAYS_QUERY,
        {
            "country": str(country).strip(),
            "startDate": sd,
            "endDate": ed,
        },
        user_id,
    )
    holidays = data.get("publicHolidays")
    if holidays is None:
        return [], None
    if not isinstance(holidays, list):
        return [], None
    normalized: list[dict[str, Any]] = []
    for raw in holidays:
        if not isinstance(raw, dict):
            continue
        date_text = str(raw.get("date") or "").strip()
        name_text = str(raw.get("name") or "").strip()
        local_name_text = str(raw.get("localName") or "").strip()
        # Campaign brief schema requires a description string for every holiday.
        description_text = str(raw.get("description") or "").strip()
        if not description_text:
            description_text = local_name_text or name_text
        normalized.append(
            {
                **deepcopy(raw),
                "date": date_text,
                "name": name_text,
                "description": description_text,
            }
        )
    return normalized, None


async def fetch_location_operating_signals(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Fetch the latest analytics run's tiered signals for a location."""
    runs_data = await graphql_post(
        client,
        ANALYTICS_RUNS_QUERY,
        {"locationId": location_id, "first": 1},
        user_id,
    )
    runs = runs_data.get("analyticsRuns")
    if not isinstance(runs, list) or not runs:
        return {
            "analytics_run": None,
            "instagram_signals": None,
        }

    run = runs[0]
    run_id = str(run.get("id", ""))

    signals_data = await graphql_post(
        client,
        LOCATION_OPERATING_SIGNALS_QUERY,
        {"locationId": str(location_id), "analyticsRunId": run_id},
        user_id,
    )

    return {
        "analytics_run": run,
        "instagram_signals": signals_data.get("instagramSignals"),
    }


async def fetch_campaign_schedule_plan(
    workflow_id: str,
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Return campaignSchedulePlan payload for milestone tools."""
    data = await graphql_post(
        client,
        CAMPAIGN_SCHEDULE_PLAN_QUERY,
        {
            "workflowId": workflow_id,
            "milestoneId": milestone_id,
            "locationId": location_id,
        },
        user_id,
    )
    raw = data.get("campaignSchedulePlan")
    return raw if isinstance(raw, dict) else None


async def fetch_promotion_engineering_candidates(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Return simplified promotion candidates for latest analytics run."""
    runs_data = await graphql_post(
        client,
        ANALYTICS_RUNS_QUERY,
        {"locationId": location_id, "first": 1},
        user_id,
    )
    runs = runs_data.get("analyticsRuns")
    if not isinstance(runs, list) or not runs:
        return None
    run = runs[0]
    run_id = str(run.get("id") or "").strip()
    if not run_id:
        return None
    data = await graphql_post(
        client,
        PROMOTION_ENGINEERING_CANDIDATES_QUERY,
        {"locationId": str(location_id), "analyticsRunId": run_id},
        user_id,
    )
    raw = data.get("promotionEngineeringCandidates")
    return raw if isinstance(raw, dict) else None


async def upsert_milestonedata_node(
    milestone_id: str,
    location_id: int,
    data: Any,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Create or update the single ``milestonedata`` child under ``milestone_id``.

    ``data`` is the payload stored in the node's ``data.data`` field.
    Delegates to :func:`agents_app.agents.core.milestone_data.graphql_client.upsert_milestonedata`.
    """
    return await upsert_milestonedata(
        milestone_id,
        location_id,
        data,
        user_id,
        client=client,
    )


__all__ = [
    "create_result_node",
    "delete_node",
    "fetch_api_adapter_tools_for_location",
    "fetch_campaign_schedule_plan",
    "fetch_promotion_engineering_candidates",
    "fetch_location_operating_signals",
    "fetch_milestone_children",
    "fetch_prior_milestones_data",
    "fetch_public_holidays_for_milestone",
    "update_passcriteria_status",
    "upsert_milestonedata_node",
]
