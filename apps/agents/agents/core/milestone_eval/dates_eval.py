"""Deterministic pass/fail checks for dates milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_dates_milestone_data(data: dict[str, Any]) -> bool:
    if not isinstance(data, dict):
        return False
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    public_holidays = data.get("publicHolidays")
    return bool(start_date and end_date and isinstance(public_holidays, list))


def enrich_dates_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_dates_milestone_data(data):
        return data
    public_holidays = data.get("publicHolidays")
    holiday_count = len(public_holidays) if isinstance(public_holidays, list) else 0
    enriched = dict(data)
    enriched["_evalHints"] = {
        "publicHolidayCount": holiday_count,
        "publicHolidaysMayBeEmpty": True,
    }
    return enriched


def try_dates_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_dates_milestone_data(data):
        return None

    normalized = _normalize_requirement(requirement)
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    public_holidays = data.get("publicHolidays")
    if not isinstance(public_holidays, list):
        public_holidays = []

    if "startdate" in normalized or ("start" in normalized and "date" in normalized):
        if start_date:
            return ("pass", f"startDate is present ({start_date}).")
        return ("fail", "dates data must include a non-empty startDate.")

    if "enddate" in normalized or ("end" in normalized and "date" in normalized):
        if end_date:
            return ("pass", f"endDate is present ({end_date}).")
        return ("fail", "dates data must include a non-empty endDate.")

    if "publicholiday" in normalized or "public holiday" in normalized:
        if not isinstance(data.get("publicHolidays"), list):
            return ("fail", "publicHolidays must be a list (empty when none fall in the window).")
        if public_holidays:
            return (
                "pass",
                f"publicHolidays lists {len(public_holidays)} holiday(s) in the campaign window.",
            )
        return (
            "pass",
            "publicHolidays is present as an empty list — no holidays fall in the selected window.",
        )

    return None
