"""Deterministic pass/fail checks for scheduler milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_scheduler_milestone_data(data: dict[str, Any]) -> bool:
    return isinstance(data.get("slots"), list)


def _slots(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("slots")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _dates_window():
    from agents_app.agents.core.milestone_run import dates_window

    return dates_window


def _slot_date_issues(data: dict[str, Any]) -> list[str]:
    dates_window = _dates_window()
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    if not start_date or not end_date:
        return ["scheduler data is missing startDate or endDate."]

    issues: list[str] = []
    for index, slot in enumerate(_slots(data)):
        iso_date = str(slot.get("date") or "").strip()
        if dates_window.parse_iso_date(iso_date) is None:
            issues.append(f"slot {index + 1} has invalid date.")
            continue
        if iso_date < start_date or iso_date > end_date:
            issues.append(f"slot {index + 1} date {iso_date} is outside the campaign window.")
    return issues


def enrich_scheduler_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_scheduler_milestone_data(data):
        return data
    dates_window = _dates_window()
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    enriched = dict(data)
    enriched["_evalHints"] = {
        "requiresStartDate": True,
        "requiresEndDate": True,
        "expectedCampaignWeeks": dates_window.count_campaign_weeks(start_date, end_date)
        if start_date and end_date
        else None,
        "slotCount": len(_slots(data)),
        "slotDateIssues": _slot_date_issues(data),
    }
    return enriched


def try_scheduler_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    normalized = _normalize_requirement(requirement)

    if not is_scheduler_milestone_data(data):
        return None

    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    slot_date_issues = _slot_date_issues(data)
    issues_text = "; ".join(slot_date_issues)

    if ("startdate" in normalized or "start date" in normalized) and "enddate" in normalized:
        if start_date and end_date:
            return ("pass", "Scheduler data includes startDate and endDate from prior dates.")
        return ("fail", "Scheduler data is missing startDate or endDate.")

    if "within" in normalized and "window" in normalized:
        if not start_date or not end_date:
            return ("fail", "Scheduler data is missing startDate or endDate.")
        if slot_date_issues:
            return ("fail", issues_text or "One or more slots fall outside the campaign window.")
        return ("pass", "All scheduled slot dates fall within the campaign window.")

    if "campaign brief" in normalized or "brief" in normalized:
        source_title = str(data.get("sourceCampaignBriefTitle") or "").strip()
        if source_title:
            return (
                "pass",
                "Scheduler recorded the prior campaign brief milestone as scheduling context.",
            )
        if start_date and end_date and _slots(data):
            return (
                "pass",
                "Scheduler produced slots within the dates window using campaign brief context.",
            )
        return ("fail", "Scheduler data does not show campaign brief scheduling context.")

    if "at least one" in normalized and "slot" in normalized:
        if _slots(data):
            return ("pass", "Scheduler includes at least one scheduled slot.")
        return ("fail", "Scheduler data has no slots.")

    return None
