"""Tests for deterministic scheduler milestone eval."""

from __future__ import annotations

from agents_app.agents.core.milestone_eval.scheduler_eval import (
    enrich_scheduler_eval_payload,
    try_scheduler_deterministic_verdict,
)
from agents_app.agents.core.milestone_run.dates_window import campaign_weeks


def _slot(
    *,
    kind: str,
    date: str,
    post_id: str | None = None,
    post_intent: str | None = None,
    reel_id: str | None = None,
    reel_intent: str | None = None,
) -> dict:
    payload: dict = {
        "kind": kind,
        "date": date,
        "time": "12:00",
        "title": f"{kind} slot",
    }
    if post_id is not None or post_intent is not None:
        payload["post"] = {
            "id": post_id or "post-unknown",
            "format": "carousel",
            "intent": post_intent or "",
            "title": "Post",
            "description": "desc",
            "slides": [{"dishName": "Dish", "imageBrief": "img"}],
            "groupIds": ["g1"],
        }
    if reel_id is not None or reel_intent is not None:
        payload["reel"] = {
            "id": reel_id or "reel-unknown",
            "format": "reel",
            "intent": reel_intent or "",
            "title": "Reel",
            "description": "desc",
            "explanation": "why",
            "groupIds": ["g1"],
        }
    return payload


def _valid_scheduler_payload() -> dict:
    start_date = "2026-06-01"
    end_date = "2026-06-28"
    weeks = campaign_weeks(start_date, end_date)
    slots: list[dict] = [
        _slot(
            kind="post",
            date="2026-06-02",
            post_id="pinned-monthly-menu",
            post_intent="pinned_monthly_menu",
        ),
    ]
    for week in weeks:
        slots.append(
            _slot(
                kind="post",
                date=week.post_date,
                post_id=f"weekday-lunch-post-week-{week.week_start}",
                post_intent="weekday_lunch_post",
            )
        )
        slots.append(
            _slot(
                kind="reel",
                date=week.week_start,
                reel_id=f"weekday-reel-week-{week.week_start}",
                reel_intent="weekday_reel",
            )
        )
        slots.append(
            _slot(
                kind="reel",
                date=week.week_end,
                reel_id=f"weekend-reel-week-{week.week_start}",
                reel_intent="weekend_reel",
            )
        )
    return {
        "startDate": start_date,
        "endDate": end_date,
        "publicHolidays": [],
        "slots": slots,
    }


def test_enrich_scheduler_eval_payload_adds_cadence_hints() -> None:
    enriched = enrich_scheduler_eval_payload(_valid_scheduler_payload())
    assert enriched["_evalHints"]["requiresStartDate"] is True
    assert enriched["_evalHints"]["expectedCampaignWeeks"] == 4
    assert enriched["_evalHints"]["expectedFourWeekBlocks"] == 1
    assert enriched["_evalHints"]["cadenceIssues"] == []


def test_monthly_and_weekday_post_same_week_passes() -> None:
    start_date = "2026-06-01"
    end_date = "2026-06-07"
    week = campaign_weeks(start_date, end_date)[0]
    payload = {
        "startDate": start_date,
        "endDate": end_date,
        "slots": [
            _slot(
                kind="post",
                date="2026-06-02",
                post_id="pinned-monthly-menu",
                post_intent="pinned_monthly_menu",
            ),
            _slot(
                kind="post",
                date=week.post_date,
                post_id=f"weekday-lunch-post-week-{week.week_start}",
                post_intent="weekday_lunch_post",
            ),
            _slot(
                kind="reel",
                date=week.week_start,
                reel_id=f"weekday-reel-week-{week.week_start}",
                reel_intent="weekday_reel",
            ),
            _slot(
                kind="reel",
                date="2026-06-07",
                reel_id=f"weekend-reel-week-{week.week_start}",
                reel_intent="weekend_reel",
            ),
        ],
    }
    verdict = try_scheduler_deterministic_verdict(
        "Each schedulable campaign week has exactly one weekday lunch post.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_monthly_menu_highlight_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Exactly one monthly menu highlight post is scheduled in each 4-week block.",
        _valid_scheduler_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_weekday_post_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Exactly one weekday post is scheduled in each campaign week.",
        _valid_scheduler_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_weekday_reel_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Exactly one weekday reel is scheduled in each campaign week.",
        _valid_scheduler_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_weekend_reel_verdict_passes() -> None:
    verdict = try_scheduler_deterministic_verdict(
        "Exactly one weekend reel is scheduled in each campaign week.",
        _valid_scheduler_payload(),
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_tail_week_without_weekend_does_not_require_weekend_reel() -> None:
    """Campaign ends Thu: final week has no Sat/Sun in-window — weekend reel optional."""
    start_date = "2026-06-01"
    end_date = "2026-06-25"
    weeks = campaign_weeks(start_date, end_date)
    assert len(weeks) >= 2
    slots: list[dict] = [
        _slot(
            kind="post",
            date="2026-06-02",
            post_id="pinned-monthly-menu",
            post_intent="pinned_monthly_menu",
        ),
    ]
    for week in weeks[:-1]:
        slots.append(
            _slot(
                kind="post",
                date=week.post_date,
                post_id=f"weekday-lunch-post-week-{week.week_start}",
                post_intent="weekday_lunch_post",
            )
        )
        slots.append(
            _slot(
                kind="reel",
                date=week.week_start,
                reel_id=f"weekday-reel-week-{week.week_start}",
                reel_intent="weekday_reel",
            )
        )
        slots.append(
            _slot(
                kind="reel",
                date=week.week_end,
                reel_id=f"weekend-reel-week-{week.week_start}",
                reel_intent="weekend_reel",
            )
        )
    last = weeks[-1]
    slots.append(
        _slot(
            kind="post",
            date=last.post_date,
            post_id=f"weekday-lunch-post-week-{last.week_start}",
            post_intent="weekday_lunch_post",
        )
    )
    slots.append(
        _slot(
            kind="reel",
            date=last.week_start,
            reel_id=f"weekday-reel-week-{last.week_start}",
            reel_intent="weekday_reel",
        )
    )
    payload = {
        "startDate": start_date,
        "endDate": end_date,
        "publicHolidays": [],
        "slots": slots,
    }
    verdict = try_scheduler_deterministic_verdict(
        "Exactly one weekend reel is scheduled in each campaign week.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "pass"


def test_weekday_post_verdict_fails_when_missing_week() -> None:
    payload = _valid_scheduler_payload()
    payload["slots"] = [
        slot
        for slot in payload["slots"]
        if not (
            slot.get("post", {}).get("intent") == "weekday_lunch_post"
            and slot.get("date") == campaign_weeks("2026-06-01", "2026-06-28")[0].post_date
        )
    ]
    verdict = try_scheduler_deterministic_verdict(
        "Exactly one weekday post is scheduled in each campaign week.",
        payload,
    )
    assert verdict is not None
    assert verdict[0] == "fail"
    assert "weekday lunch posts" in verdict[1]
