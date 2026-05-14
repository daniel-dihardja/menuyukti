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
        "slots": [],
        "sourceDatesTitle": "Campaign dates",
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
