"""Tests for reel_lineup deterministic eval."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.reel_lineup_eval import (
    enrich_reel_lineup_eval_payload,
    try_reel_lineup_deterministic_verdict,
)
from agents_app.agents.core.milestone_run.dates_window import campaign_weeks
from agents_app.agents.core.milestone_run.reel_lineup.build import build_reel_lineup_from_plan

START_DATE = "2026-06-01"
END_DATE = "2026-06-14"


def _groups() -> list[dict]:
    return [
        {
            "id": "group-1",
            "anchor": {"dimension": "reel_moment", "value": "static_hero"},
            "items": [{"name": "Ribeye", "reelMoment": "static_hero"}],
        },
        {
            "id": "group-2",
            "anchor": {"dimension": "reel_moment", "value": "static_hero"},
            "items": [{"name": "Burger", "reelMoment": "static_hero"}],
        },
    ]


def _payload() -> dict:
    weeks = campaign_weeks(START_DATE, END_DATE)
    weekly = [
        {
            "weekIndex": week.week_index,
            "weekdayReel": {
                "groupId": "group-1",
                "title": f"W{week.week_index} weekday",
                "description": "Desc",
                "explanation": "Why",
            },
            "weekendReel": {
                "groupId": "group-2",
                "title": f"W{week.week_index} weekend",
                "description": "Desc",
                "explanation": "Why",
            },
        }
        for week in weeks
    ]
    return build_reel_lineup_from_plan(
        weekly_reels=weekly,
        campaign_weeks=weeks,
        groups=_groups(),
        campaign_brief_data={},
        start_date=START_DATE,
        end_date=END_DATE,
        source_dates_title="Dates",
    )


def test_enrich_reel_lineup_eval_payload() -> None:
    data = _payload()
    enriched = enrich_reel_lineup_eval_payload(data)
    hints = enriched["_evalHints"]
    assert hints["reelCount"] == len(data["reels"])
    assert hints["expectedReelCount"] == len(data["reels"])


def test_try_reel_lineup_two_reels_per_week() -> None:
    data = _payload()
    verdict = try_reel_lineup_deterministic_verdict(
        "Includes two reels per campaign week in the dates window.",
        data,
    )
    assert verdict == ("pass", verdict[1])


def test_try_reel_lineup_description_explanation() -> None:
    data = _payload()
    verdict = try_reel_lineup_deterministic_verdict(
        "Every reel has description and explanation fields.",
        data,
    )
    assert verdict is not None
    assert verdict[0] == "pass"
