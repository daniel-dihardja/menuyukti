"""Tests for deterministic scheduler milestone eval."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.scheduler_eval import (
    enrich_scheduler_eval_payload,
    try_scheduler_deterministic_verdict,
)


def _sample_payload() -> dict:
    return {
        "startDate": "2026-06-01",
        "endDate": "2026-06-30",
        "publicHolidays": [],
        "slots": [
            {
                "kind": "reel",
                "date": "2026-06-02",
                "time": "11:00",
                "title": "Reel: Ribeye lunch offer (11:00-14:00) [hero]",
            }
        ],
        "sourceDatesTitle": "Campaign dates",
        "sourceCampaignBriefTitle": "Campaign brief",
        "sourceReelLineupTitle": "Lunch Reel Lineup",
    }


def test_enrich_scheduler_eval_payload_adds_hints() -> None:
    enriched = enrich_scheduler_eval_payload(_sample_payload())
    assert enriched["_evalHints"]["requiresStartDate"] is True
    assert enriched["_evalHints"]["requiresEndDate"] is True


def test_prior_dates_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Run used a prior dates milestone with saved start and end dates.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_window_present_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Scheduler data includes startDate and endDate for the campaign window.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_window_present_verdict_fails_when_missing_dates() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Scheduler data includes startDate and endDate for the campaign window.",
        {"startDate": "", "endDate": "", "publicHolidays": [], "slots": []},
    )
    assert verdict is not None
    assert verdict[0] == "fail"


def test_prior_campaign_brief_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Run used a prior campaign brief milestone.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_prior_reel_lineup_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Run used a prior reel lineup milestone.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_explicit_reel_slot_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Scheduler outputs explicit typed reel slots.",
        _sample_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"
