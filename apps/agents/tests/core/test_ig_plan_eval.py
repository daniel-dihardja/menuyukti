"""Tests for deterministic IG Plan milestone eval checks."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.ig_plan_eval import (
    enrich_ig_plan_eval_payload,
    sort_ig_plan_entries,
    try_ig_plan_deterministic_verdict,
)

_WEEKLY_ENTRIES_REQ = (
    "Data includes one or more **entries** for open weekdays with meaningful analytics slots. "
    "Each entry has **day**, **slot** (HH:MM), **objective**, **pillar**, **mealPeriod**, "
    "**productRole**, **slotStrategy**, and **slotKey**. **entries** are ordered by weekday "
    "(monday through sunday), with same-day rows grouped together."
)
_SLOT_GROUNDING_REQ = (
    "Each entry uses a valid **slotStrategy**, **pillar**, and **productRole**. "
    "Publish **slot** times should be plausible for the venue day when opening hours are available."
)
_SCHEDULE_EXPLANATION_REQ = (
    "Data includes a non-empty **scheduleExplanation** summarizing where marketing effort "
    "is allocated across the week and why."
)


def _entry(**overrides: str) -> dict[str, str]:
    base = {
        "day": "wednesday",
        "slot": "14:30",
        "objective": "Increase afternoon traffic",
        "pillar": "hero",
        "mealPeriod": "afternoon",
        "productRole": "puzzle",
        "slotStrategy": "aggressively_grow",
        "slotKey": "wednesday-afternoon",
    }
    base.update(overrides)
    return base


def _payload(*entries: dict[str, str]) -> dict:
    return {
        "scheduleExplanation": (
            "Push hero content on weak afternoon slots while using reminder pillars "
            "on strong lunch periods."
        ),
        "entries": list(entries),
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "_evalHints": {
            "openingHours": [
                {"dayOfWeek": "monday", "openTime": "11:00", "closeTime": "22:00"},
                {"dayOfWeek": "wednesday", "openTime": "11:00", "closeTime": "22:00"},
            ],
            "slotDemandByKey": {
                "wednesday-afternoon": "low",
                "monday-lunch": "high",
            },
        },
    }


def test_weekly_entries_passes_for_valid_ordered_payload() -> None:
    verdict = try_ig_plan_deterministic_verdict(
        _WEEKLY_ENTRIES_REQ,
        _payload(
            _entry(day="monday", slot="11:30", mealPeriod="lunch", slotKey="monday-lunch"),
            _entry(),
        ),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_weekly_entries_fails_when_days_are_interleaved() -> None:
    verdict = try_ig_plan_deterministic_verdict(
        _WEEKLY_ENTRIES_REQ,
        _payload(
            _entry(day="monday", slot="11:30", mealPeriod="lunch", slotKey="monday-lunch"),
            _entry(day="wednesday", slot="14:30"),
            _entry(day="monday", slot="18:00", mealPeriod="dinner", slotKey="monday-dinner"),
        ),
    )
    assert verdict is not None
    assert verdict[0] == "fail"
    assert "ordered by weekday" in verdict[1]


def test_slot_grounding_passes_for_strategy_aligned_entry() -> None:
    verdict = try_ig_plan_deterministic_verdict(_SLOT_GROUNDING_REQ, _payload(_entry()))
    assert verdict is not None
    assert verdict[0] == "pass"


def test_slot_grounding_fails_for_invalid_slot_strategy() -> None:
    verdict = try_ig_plan_deterministic_verdict(
        _SLOT_GROUNDING_REQ,
        _payload(_entry(slotStrategy="boost")),
    )
    assert verdict is not None
    assert verdict[0] == "fail"
    assert "slotStrategy" in verdict[1]


def test_schedule_explanation_passes() -> None:
    verdict = try_ig_plan_deterministic_verdict(_SCHEDULE_EXPLANATION_REQ, _payload(_entry()))
    assert verdict is not None
    assert verdict[0] == "pass"


def test_sort_entries_orders_by_weekday_then_time() -> None:
    sorted_entries = sort_ig_plan_entries(
        [
            _entry(day="friday", slot="12:00"),
            _entry(day="monday", slot="18:00", mealPeriod="dinner", slotKey="monday-dinner"),
            _entry(day="monday", slot="11:30", mealPeriod="lunch", slotKey="monday-lunch"),
        ]
    )
    assert [entry["day"] for entry in sorted_entries] == ["monday", "monday", "friday"]
    assert sorted_entries[0]["slot"] == "11:30"
    assert sorted_entries[1]["slot"] == "18:00"


def test_enrich_payload_adds_order_hint() -> None:
    enriched = enrich_ig_plan_eval_payload(_payload(_entry()))
    assert enriched["_evalHints"]["entriesOrderedByDay"] is True
