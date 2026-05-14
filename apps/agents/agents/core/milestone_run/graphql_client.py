"""GraphQL helpers for milestone run tools: upsert data + re-exports from milestone eval."""

from __future__ import annotations

import json
import logging
from copy import deepcopy
from typing import Any, TypedDict

import httpx
from agents_app.agents.core.milestone_data.graphql_client import upsert_milestonedata
from agents_app.agents.core.milestone_eval.graphql_client import (
    delete_node,
    fetch_milestone_children,
    update_milestone_passcriteria_status,
)
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    ANALYTICS_RUNS_QUERY,
    LOCATION_OPERATING_SIGNALS_QUERY,
    LOCATION_QUERY,
    PRIOR_MILESTONES_MILESTONE_DATA_QUERY,
    PROMOTION_ENGINEERING_CANDIDATES_QUERY,
    PUBLIC_HOLIDAYS_QUERY,
)

_logger = logging.getLogger(__name__)


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


class PromotionEngineeringCandidatesFetchResult(TypedDict):
    candidates: dict[str, Any] | None
    analyticsRunId: str | None


async def fetch_promotion_engineering_candidates(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
    max_star_items: int | None = None,
    max_puzzle_items: int | None = None,
) -> PromotionEngineeringCandidatesFetchResult:
    """Return promotion candidates and analytics run id for latest run."""
    runs_data = await graphql_post(
        client,
        ANALYTICS_RUNS_QUERY,
        {"locationId": location_id, "first": 1},
        user_id,
    )
    runs = runs_data.get("analyticsRuns")
    if not isinstance(runs, list) or not runs:
        return {"candidates": None, "analyticsRunId": None}
    run = runs[0]
    run_id = str(run.get("id") or "").strip()
    if not run_id:
        return {"candidates": None, "analyticsRunId": None}
    variables: dict[str, Any] = {
        "locationId": str(location_id),
        "analyticsRunId": run_id,
    }
    if max_star_items is not None:
        variables["maxStarItems"] = max_star_items
    if max_puzzle_items is not None:
        variables["maxPuzzleItems"] = max_puzzle_items
    data = await graphql_post(
        client,
        PROMOTION_ENGINEERING_CANDIDATES_QUERY,
        variables,
        user_id,
    )
    raw = data.get("promotionEngineeringCandidates")
    candidates = raw if isinstance(raw, dict) else None
    return {"candidates": candidates, "analyticsRunId": run_id}


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
    "delete_node",
    "fetch_promotion_engineering_candidates",
    "fetch_location_operating_signals",
    "fetch_milestone_children",
    "fetch_prior_milestones_data",
    "fetch_public_holidays_for_milestone",
    "update_milestone_passcriteria_status",
    "upsert_milestonedata_node",
]
