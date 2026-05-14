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

    return None
