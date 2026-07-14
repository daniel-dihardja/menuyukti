"""Deterministic pass/fail checks for IG Plan milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

_WEEKDAY_ORDER = (
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
)

_VALID_PILLARS = frozenset(
    {
        "hero",
        "reminder",
        "lifestyle",
        "community",
        "social_proof",
        "educational",
        "product_discovery",
    }
)

_VALID_PRODUCT_ROLES = frozenset({"star", "puzzle", "plow_horse"})

_VALID_SLOT_STRATEGIES = frozenset({"maintain", "support", "grow", "aggressively_grow"})

_SLOT_TIME_RE = re.compile(r"^\d{2}:\d{2}$")


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_ig_plan_milestone_data(data: dict[str, Any]) -> bool:
    from agents_app.agents.core.milestone_eval.ig_format_eval import (
        is_ig_format_milestone_data,
    )
    from agents_app.agents.core.milestone_eval.ig_menu_picker_eval import (
        is_ig_menu_picker_milestone_data,
    )

    if is_ig_format_milestone_data(data):
        return False
    if is_ig_menu_picker_milestone_data(data):
        return False
    entries = data.get("entries")
    return isinstance(entries, list) and isinstance(data.get("scheduleExplanation"), str)


def _entries(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("entries")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _eval_hints(data: dict[str, Any]) -> dict[str, Any]:
    hints = data.get("_evalHints")
    return hints if isinstance(hints, dict) else {}


def _weekday_index(day: str) -> int:
    return _WEEKDAY_ORDER.index(day) if day in _WEEKDAY_ORDER else len(_WEEKDAY_ORDER)


def _entries_ordered_by_day(entries: list[dict[str, Any]]) -> bool:
    if len(entries) <= 1:
        return True
    previous = -1
    for entry in entries:
        day = str(entry.get("day") or "").strip().lower()
        if day not in _WEEKDAY_ORDER:
            return False
        index = _weekday_index(day)
        if index < previous:
            return False
        previous = index
    return True


def _sort_key(entry: dict[str, Any]) -> tuple[int, str]:
    day = str(entry.get("day") or "").strip().lower()
    slot = str(entry.get("slot") or "").strip()
    return (_weekday_index(day), slot)


def sort_ig_plan_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(entries, key=_sort_key)


def _opening_hours_index(hours: list[dict[str, Any]]) -> dict[str, tuple[str, str]]:
    index: dict[str, tuple[str, str]] = {}
    for row in hours:
        if not isinstance(row, dict):
            continue
        day = str(row.get("dayOfWeek") or row.get("day_of_week") or "").strip().lower()
        open_time = str(row.get("openTime") or row.get("open_time") or "").strip()
        close_time = str(row.get("closeTime") or row.get("close_time") or "").strip()
        if day and open_time and close_time:
            index[day] = (open_time, close_time)
    return index


def _slot_within_hours(slot: str, open_time: str, close_time: str) -> bool:
    return open_time <= slot <= close_time


def _is_weekly_entries_requirement(norm: str) -> bool:
    if "one or more" in norm and "entries" in norm:
        return True
    if "each entry has" in norm:
        return True
    if "weekly" in norm and "entries" in norm:
        return True
    return "posture" in norm and "slotkey" in norm


def _is_slot_grounding_requirement(norm: str) -> bool:
    if "slotstrategy" in norm or "slot strategy" in norm:
        return True
    if "openinghours" in norm or "opening hours" in norm:
        return True
    if "productrole" in norm and "align" in norm:
        return True
    return "posture" in norm and "productrole" in norm


def _strategy_alignment_issues(entry: dict[str, Any]) -> list[str]:
    issues: list[str] = []
    strategy = str(entry.get("slotStrategy") or "").strip().lower()
    pillar = str(entry.get("pillar") or "").strip().lower()
    product_role = str(entry.get("productRole") or "").strip().lower()
    if strategy not in _VALID_SLOT_STRATEGIES:
        issues.append(f"invalid slotStrategy {strategy!r}")
    if pillar not in _VALID_PILLARS:
        issues.append(f"invalid pillar {pillar!r}")
    if product_role not in _VALID_PRODUCT_ROLES:
        issues.append(f"invalid productRole {product_role!r}")

    return issues


def enrich_ig_plan_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_ig_plan_milestone_data(data):
        return data
    entries = _entries(data)
    hints = dict(_eval_hints(data))
    hints.setdefault("entryCount", len(entries))
    hints.setdefault("entriesOrderedByDay", _entries_ordered_by_day(entries))
    enriched = dict(data)
    enriched["_evalHints"] = hints
    return enriched


def try_ig_plan_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_ig_plan_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    entries = _entries(data)
    hints = _eval_hints(data)
    raw_opening_hours = hints.get("openingHours")
    hours_list: list[dict[str, Any]] = []
    if isinstance(raw_opening_hours, list):
        hours_list = [row for row in raw_opening_hours if isinstance(row, dict)]
    opening_hours = _opening_hours_index(hours_list)

    if "scheduleexplanation" in norm or "schedule explanation" in norm:
        explanation = str(data.get("scheduleExplanation") or "").strip()
        if len(explanation) < 10:
            return ("fail", "scheduleExplanation is missing or too short.")
        return (
            "pass",
            "scheduleExplanation summarizes the weekly marketing allocation strategy.",
        )

    if _is_weekly_entries_requirement(norm):
        if not entries:
            return ("fail", "entries must contain at least one strategy row.")
        issues: list[str] = []
        required_fields = (
            "day",
            "slot",
            "objective",
            "pillar",
            "mealPeriod",
            "productRole",
            "slotStrategy",
            "slotKey",
        )
        for index, entry in enumerate(entries, start=1):
            for field in required_fields:
                if not str(entry.get(field) or "").strip():
                    issues.append(f"entry {index} is missing {field}")
            day = str(entry.get("day") or "").strip().lower()
            if day and day not in _WEEKDAY_ORDER:
                issues.append(f"entry {index} has invalid day {day!r}")
            slot = str(entry.get("slot") or "").strip()
            if slot and not _SLOT_TIME_RE.fullmatch(slot):
                issues.append(f"entry {index} slot must be HH:MM (found {slot!r})")
            pillar = str(entry.get("pillar") or "").strip().lower()
            if pillar and pillar not in _VALID_PILLARS:
                issues.append(f"entry {index} has invalid pillar {pillar!r}")
            product_role = str(entry.get("productRole") or "").strip().lower()
            if product_role and product_role not in _VALID_PRODUCT_ROLES:
                issues.append(f"entry {index} has invalid productRole {product_role!r}")
            strategy = str(entry.get("slotStrategy") or "").strip().lower()
            if strategy and strategy not in _VALID_SLOT_STRATEGIES:
                issues.append(f"entry {index} has invalid slotStrategy {strategy!r}")
            if opening_hours and day in opening_hours and slot:
                open_time, close_time = opening_hours[day]
                if not _slot_within_hours(slot, open_time, close_time):
                    issues.append(
                        f"entry {index} slot {slot} is outside opening hours "
                        f"{open_time}-{close_time} on {day}"
                    )
            elif opening_hours and day and day not in opening_hours:
                issues.append(f"entry {index} schedules on closed day {day}")

        if not _entries_ordered_by_day(entries):
            issues.append(
                "entries must be ordered by weekday (monday through sunday), "
                "not interleaved (e.g. monday, wednesday, friday, monday)"
            )

        if issues:
            return ("fail", "; ".join(issues[:6]) + ("…" if len(issues) > 6 else ""))
        return (
            "pass",
            f"entries includes {len(entries)} ordered strategy row(s) with required fields.",
        )

    if _is_slot_grounding_requirement(norm):
        if not entries:
            return ("fail", "entries must contain at least one strategy row.")
        grounding_issues: list[str] = []
        for index, entry in enumerate(entries, start=1):
            grounding_issues.extend(
                f"entry {index}: {issue}"
                for issue in _strategy_alignment_issues(entry)
            )
            if opening_hours:
                day = str(entry.get("day") or "").strip().lower()
                slot = str(entry.get("slot") or "").strip()
                if day in opening_hours and slot:
                    open_time, close_time = opening_hours[day]
                    if not _slot_within_hours(slot, open_time, close_time):
                        grounding_issues.append(
                            f"entry {index} slot {slot} is outside opening hours "
                            f"{open_time}-{close_time} on {day}"
                        )

        if grounding_issues:
            return ("fail", "; ".join(grounding_issues[:6]) + ("…" if len(grounding_issues) > 6 else ""))
        grounding = "each entry has valid slotStrategy, pillar, and productRole"
        if opening_hours:
            grounding += "; publish slots fall within opening hours"
        return ("pass", grounding + ".")

    return None
