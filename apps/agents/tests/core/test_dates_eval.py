"""Tests for dates deterministic eval helpers."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.dates_eval import try_dates_deterministic_verdict


def _dates_payload(*, public_holidays: list[dict[str, str]] | None = None) -> dict[str, object]:
    return {
        "startDate": "2026-06-01",
        "endDate": "2026-06-30",
        "publicHolidays": [] if public_holidays is None else public_holidays,
    }


def test_public_holidays_criterion_passes_when_empty() -> None:
    verdict = try_dates_deterministic_verdict(
        "**publicHolidays** is present for the selected date window (an empty list is valid when no holidays fall in range).",
        _dates_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"
    assert "empty" in verdict[1].lower()


def test_public_holidays_criterion_passes_when_populated() -> None:
    verdict = try_dates_deterministic_verdict(
        "**publicHolidays** is generated for the selected date window.",
        _dates_payload(
            public_holidays=[
                {"name": "Holiday A", "description": "Desc", "date": "2026-06-05"},
            ]
        ),
    )
    assert verdict == ("pass", "publicHolidays lists 1 holiday(s) in the campaign window.")


def test_start_date_criterion_passes() -> None:
    verdict = try_dates_deterministic_verdict(
        "**startDate** is set in milestone data.",
        _dates_payload(),
    )
    assert verdict == ("pass", "startDate is present (2026-06-01).")


def test_end_date_criterion_passes() -> None:
    verdict = try_dates_deterministic_verdict(
        "**endDate** is set in milestone data.",
        _dates_payload(),
    )
    assert verdict == ("pass", "endDate is present (2026-06-30).")
