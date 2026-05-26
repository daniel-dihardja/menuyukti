"""Deterministic pass/fail checks for scheduler milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_scheduler_milestone_data(data: dict[str, Any]) -> bool:
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    return bool(start_date and end_date)


def enrich_scheduler_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_scheduler_milestone_data(data):
        return data
    enriched = dict(data)
    enriched["_evalHints"] = {
        "requiresStartDate": True,
        "requiresEndDate": True,
    }
    return enriched


def try_scheduler_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    normalized = _normalize_requirement(requirement)
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()

    if "startdate" in normalized and "enddate" in normalized:
        if start_date and end_date:
            return (
                "pass",
                "Scheduler data includes both startDate and endDate for the campaign window.",
            )
        return (
            "fail",
            "Scheduler data must include both startDate and endDate.",
        )

    if not is_scheduler_milestone_data(data):
        return None

    if "prior" in normalized and "dates" in normalized:
        if start_date and end_date:
            return (
                "pass",
                "Scheduler data includes a campaign window copied from a prior dates milestone.",
            )
        return (
            "fail",
            "Scheduler data is missing startDate or endDate from the prior dates milestone.",
        )

    if "prior" in normalized and "campaign" in normalized and "brief" in normalized:
        source_title = str(data.get("sourceCampaignBriefTitle") or "").strip()
        if source_title:
            return (
                "pass",
                "Scheduler data references a prior restaurant_campaign_brief milestone.",
            )
        return (
            "fail",
            "Scheduler data is missing sourceCampaignBriefTitle from the prior campaign brief.",
        )

    if "prior" in normalized and "reel" in normalized and "lineup" in normalized:
        source_title = str(data.get("sourceReelLineupTitle") or "").strip()
        if source_title:
            return (
                "pass",
                "Scheduler data references a prior reel_lineup milestone via sourceReelLineupTitle.",
            )
        slots = data.get("slots")
        if isinstance(slots, list) and any(
            isinstance(slot, dict) and str(slot.get("kind") or "").strip() == "reel"
            for slot in slots
        ):
            return (
                "pass",
                "Scheduler slots include reel entries from reel_lineup.",
            )
        return (
            "fail",
            "Scheduler data is missing reel_lineup reference or reel slots.",
        )

    if "reel" in normalized and ("kind" in normalized or "typed" in normalized or "slot" in normalized):
        slots = data.get("slots")
        if isinstance(slots, list) and any(
            isinstance(slot, dict) and str(slot.get("kind") or "").strip() == "reel"
            for slot in slots
        ):
            return (
                "pass",
                "Scheduler data includes explicit reel slots with kind='reel'.",
            )
        return (
            "fail",
            "Scheduler data must include explicit reel slots with kind='reel'.",
        )

    return None
