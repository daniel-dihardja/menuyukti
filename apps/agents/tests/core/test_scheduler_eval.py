"""Tests for deterministic scheduler milestone eval."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.scheduler_eval import (
    enrich_scheduler_eval_payload,
    try_scheduler_deterministic_verdict,
)


def _slot(*, kind: str, date: str, title: str = "Slot title") -> dict:
    return {
        "kind": kind,
        "date": date,
        "time": "12:00",
        "title": title,
    }


def _valid_scheduler_payload() -> dict:
    return {
        "startDate": "2026-06-01",
        "endDate": "2026-06-28",
        "sourceCampaignBriefTitle": "Campaign brief",
        "publicHolidays": [],
        "slots": [
            _slot(kind="post", date="2026-06-02", title="Post: Top 5 MAINS"),
            _slot(kind="reel", date="2026-06-09", title="Reel: Weekday lunch"),
            _slot(kind="story", date="2026-06-15", title="Story: Holiday greeting"),
        ],
    }


def test_enrich_scheduler_eval_payload_adds_window_hints() -> None:
    enriched = enrich_scheduler_eval_payload(_valid_scheduler_payload())
    assert enriched["_evalHints"]["requiresStartDate"] is True
    assert enriched["_evalHints"]["expectedCampaignWeeks"] == 4
    assert enriched["_evalHints"]["slotCount"] == 3
    assert enriched["_evalHints"]["slotDateIssues"] == []


def test_dates_window_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Scheduler data includes startDate and endDate from prior dates.",
        _valid_scheduler_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_slots_in_window_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "All scheduled slot dates fall within the campaign window.",
        _valid_scheduler_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_slots_in_window_verdict_fails_for_out_of_range_date() -> None:
    payload = {
        **_valid_scheduler_payload(),
        "slots": [_slot(kind="post", date="2026-07-01", title="Post: Outside window")],
    }
    verdict = try_scheduler_deterministic_verdict(
        "All scheduled slot dates fall within the campaign window.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_campaign_brief_context_verdict_passes_with_source_title() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Scheduler used prior restaurant_campaign_brief strategy for timing and cadence.",
        _valid_scheduler_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_at_least_one_slot_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Scheduler includes at least one scheduled slot.",
        _valid_scheduler_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_at_least_one_slot_verdict_fails_when_empty() -> None:
    payload = {
        "startDate": "2026-06-01",
        "endDate": "2026-06-28",
        "publicHolidays": [],
        "slots": [],
    }
    verdict = try_scheduler_deterministic_verdict(
        "Scheduler includes at least one scheduled slot.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"
