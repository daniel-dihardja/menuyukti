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
    IG_PLAN_INPUTS_QUERY,
    LATEST_ANALYTICS_RUN_WITH_SIGNALS_QUERY,
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
        # Campaign window is still valid without holiday data when country is unset.
        return [], None

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
    data = await graphql_post(
        client,
        LATEST_ANALYTICS_RUN_WITH_SIGNALS_QUERY,
        {"locationId": location_id},
        user_id,
    )
    payload = data.get("latestAnalyticsRunWithSignals")
    if not isinstance(payload, dict):
        return {
            "analytics_run": None,
            "instagram_signals": None,
        }
    return {
        "analytics_run": payload.get("analyticsRun"),
        "instagram_signals": payload.get("instagramSignals"),
    }


class PromotionEngineeringCandidatesFetchResult(TypedDict):
    candidates: dict[str, Any] | None
    analyticsRunId: str | None


class IgPlanInputsFetchResult(TypedDict):
    analyticsRunId: str
    locationRaw: dict[str, Any]
    slotPerformance: dict[str, Any]
    menuEngineeringMatrix: dict[str, Any]
    slotMenuCandidates: dict[str, Any]
    coverageNotes: list[str]


def _location_snapshot_to_raw(location: dict[str, Any]) -> dict[str, Any]:
    manual = location.get("manualBriefInput")
    manual_dict = manual if isinstance(manual, dict) else None
    opening_hours_raw = location.get("openingHours")
    opening_hours: list[dict[str, str]] = []
    if isinstance(opening_hours_raw, list):
        for row in opening_hours_raw:
            if not isinstance(row, dict):
                continue
            day = str(row.get("dayOfWeek") or "").strip()
            open_time = str(row.get("openTime") or "").strip()
            close_time = str(row.get("closeTime") or "").strip()
            if day and open_time and close_time:
                opening_hours.append(
                    {
                        "dayOfWeek": day,
                        "openTime": open_time,
                        "closeTime": close_time,
                    }
                )
    return {
        "id": location.get("id"),
        "name": location.get("name"),
        "street": location.get("street"),
        "city": location.get("city"),
        "country": location.get("country"),
        "currency": location.get("currency"),
        "manualBriefInput": manual_dict,
        "openingHours": opening_hours,
    }


async def fetch_ig_plan_inputs(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
    max_candidates_per_slot: int = 5,
    analytics_run_id: str | None = None,
) -> IgPlanInputsFetchResult:
    """Fetch composite IG Plan inputs (location profile + analytics) in one GraphQL request."""
    from agents_app.agents.core.milestone_run.ig_plan.slot_performance import (
        build_slot_performance_payload,
    )

    variables: dict[str, Any] = {
        "locationId": location_id,
        "options": {
            "includeLowEnd": False,
            "maxCandidatesPerSlot": max_candidates_per_slot,
            "matrixCategories": ["star", "plow_horse", "puzzle"],
        },
    }
    pinned_run_id = str(analytics_run_id or "").strip()
    if pinned_run_id:
        variables["analyticsRunId"] = pinned_run_id

    data = await graphql_post(
        client,
        IG_PLAN_INPUTS_QUERY,
        variables,
        user_id,
    )
    raw = data.get("igPlanInputs")
    if not isinstance(raw, dict):
        raise ValueError("ig_plan requires location access and igPlanInputs data")

    location = raw.get("location")
    if not isinstance(location, dict):
        raise ValueError("ig_plan requires location profile data")

    analytics_run = raw.get("analyticsRun")
    if not isinstance(analytics_run, dict):
        raise ValueError("ig_plan requires at least one analytics run for this location")
    run_id = str(analytics_run.get("id") or "").strip()
    if not run_id:
        raise ValueError("ig_plan requires a valid analytics run id")

    slot_profile = raw.get("slotDemandProfile")
    profile_list = slot_profile if isinstance(slot_profile, list) else []
    slot_performance = build_slot_performance_payload({"slot_demand_profile": profile_list})
    if slot_performance is None:
        raise ValueError(
            "ig_plan requires venue slot strength data (slotDemandProfile) from the latest analytics run"
        )

    matrix = raw.get("menuEngineeringMatrix")
    if not isinstance(matrix, dict):
        raise ValueError(
            "ig_plan requires menu engineering matrix data (COGS must be set on the analytics run)"
        )

    slot_candidates = raw.get("slotMenuCandidates")
    if not isinstance(slot_candidates, dict):
        raise ValueError(
            "ig_plan requires slot menu promotion candidates (analytics run must have order facts)"
        )

    coverage_notes = raw.get("coverageNotes")
    notes = (
        [str(note) for note in coverage_notes if str(note).strip()]
        if isinstance(coverage_notes, list)
        else []
    )

    slot_performance["sourceAnalyticsRunId"] = run_id
    return {
        "analyticsRunId": run_id,
        "locationRaw": _location_snapshot_to_raw(location),
        "slotPerformance": slot_performance,
        "menuEngineeringMatrix": matrix,
        "slotMenuCandidates": slot_candidates,
        "coverageNotes": notes,
    }


async def fetch_ig_plan_analytics(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
    max_candidates_per_slot: int = 5,
) -> IgPlanInputsFetchResult:
    """Deprecated alias for :func:`fetch_ig_plan_inputs`."""
    return await fetch_ig_plan_inputs(
        location_id,
        user_id,
        client=client,
        max_candidates_per_slot=max_candidates_per_slot,
    )


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
    "fetch_ig_plan_inputs",
    "fetch_ig_plan_analytics",
    "fetch_promotion_engineering_candidates",
    "fetch_location_operating_signals",
    "fetch_milestone_children",
    "fetch_prior_milestones_data",
    "fetch_public_holidays_for_milestone",
    "update_milestone_passcriteria_status",
    "upsert_milestonedata_node",
]
