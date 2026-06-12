"""Deterministic pass/fail checks for scheduler milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

POST_MONTHLY_ID = "pinned-monthly-menu"
POST_WEEKDAY_ID_PREFIX = "weekday-lunch-post-week"
REEL_WEEKDAY_ID_PREFIX = "weekday-reel-week"
REEL_WEEKEND_ID_PREFIX = "weekend-reel-week"


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_scheduler_milestone_data(data: dict[str, Any]) -> bool:
    return isinstance(data.get("slots"), list)


def _slots(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("slots")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _classify_post_slot(slot: dict[str, Any]) -> Literal["monthly", "weekday", "other", ""]:
    post = slot.get("post")
    if not isinstance(post, dict):
        return ""
    post_id = str(post.get("id") or "").strip()
    intent = str(post.get("intent") or "").strip()
    if post_id == POST_MONTHLY_ID or intent == "pinned_monthly_menu":
        return "monthly"
    if post_id.startswith(POST_WEEKDAY_ID_PREFIX) or intent == "weekday_lunch_post":
        return "weekday"
    return "other"


def _classify_reel_slot(slot: dict[str, Any]) -> Literal["weekday", "weekend", ""]:
    reel = slot.get("reel")
    if not isinstance(reel, dict):
        return ""
    reel_id = str(reel.get("id") or "").strip()
    intent = str(reel.get("intent") or "").strip()
    if reel_id.startswith(REEL_WEEKDAY_ID_PREFIX) or intent == "weekday_reel":
        return "weekday"
    if reel_id.startswith(REEL_WEEKEND_ID_PREFIX) or intent == "weekend_reel":
        return "weekend"
    return ""


def _dates_window():
    from agents_app.agents.core.milestone_run import dates_window

    return dates_window


def _weekly_block_index(iso_date: str, start_date: str, end_date: str) -> int | None:
    dates_window = _dates_window()
    parsed = dates_window.parse_iso_date(iso_date)
    start = dates_window.parse_iso_date(start_date)
    end = dates_window.parse_iso_date(end_date)
    if parsed is None or start is None or end is None or parsed < start or parsed > end:
        return None
    for idx, (block_start, block_end) in enumerate(
        dates_window.interval_block_starts(start_date, end_date, interval_weeks=4)
    ):
        if block_start <= iso_date <= block_end:
            return idx
    return None


def _campaign_week_start(iso_date: str, start_date: str, end_date: str) -> str | None:
    for week in _dates_window().campaign_weeks(start_date, end_date):
        if week.week_start <= iso_date <= week.week_end:
            return week.week_start
    return None


def _cadence_issues(data: dict[str, Any]) -> list[str]:
    dates_window = _dates_window()
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    if not start_date or not end_date:
        return ["scheduler data is missing startDate or endDate."]

    weeks = dates_window.campaign_weeks(start_date, end_date)
    if not weeks:
        return ["scheduler campaign window has no campaign weeks."]

    blocks = list(dates_window.interval_block_starts(start_date, end_date, interval_weeks=4))
    monthlies_by_block: dict[int, int] = {idx: 0 for idx in range(len(blocks))}
    weekday_posts_by_week: dict[str, int] = {week.week_start: 0 for week in weeks}
    weekday_reels_by_week: dict[str, int] = {week.week_start: 0 for week in weeks}
    weekend_reels_by_week: dict[str, int] = {week.week_start: 0 for week in weeks}

    for slot in _slots(data):
        iso_date = str(slot.get("date") or "").strip()
        if dates_window.parse_iso_date(iso_date) is None:
            continue

        post_kind = _classify_post_slot(slot)
        if post_kind == "monthly":
            block_index = _weekly_block_index(iso_date, start_date, end_date)
            if block_index is not None:
                monthlies_by_block[block_index] = monthlies_by_block.get(block_index, 0) + 1
        elif post_kind == "weekday":
            week_start = _campaign_week_start(iso_date, start_date, end_date)
            if week_start is not None:
                weekday_posts_by_week[week_start] = weekday_posts_by_week.get(week_start, 0) + 1

        reel_kind = _classify_reel_slot(slot)
        if reel_kind == "weekday":
            week_start = _campaign_week_start(iso_date, start_date, end_date)
            if week_start is not None:
                weekday_reels_by_week[week_start] = weekday_reels_by_week.get(week_start, 0) + 1
        elif reel_kind == "weekend":
            week_start = _campaign_week_start(iso_date, start_date, end_date)
            if week_start is not None:
                weekend_reels_by_week[week_start] = weekend_reels_by_week.get(week_start, 0) + 1

    issues: list[str] = []
    for block_index in range(len(blocks)):
        count = monthlies_by_block.get(block_index, 0)
        if count != 1:
            issues.append(
                f"4-week block {block_index + 1} has {count} monthly menu highlight posts (expected 1)."
            )

    for week in weeks:
        week_label = f"campaign week {week.week_index}"
        if not dates_window.week_requires_weekly_cadence(
            week.week_start,
            week.week_end,
            start_date,
            end_date,
        ):
            continue

        post_count = weekday_posts_by_week.get(week.week_start, 0)
        if post_count != 1:
            issues.append(
                f"{week_label} has {post_count} weekday lunch posts (expected 1; "
                "monthly menu highlight posts are separate)."
            )

        if dates_window.week_has_weekday_in_overlap(
            week.week_start,
            week.week_end,
            start_date,
            end_date,
        ):
            weekday_reel_count = weekday_reels_by_week.get(week.week_start, 0)
            if weekday_reel_count != 1:
                issues.append(
                    f"{week_label} has {weekday_reel_count} weekday reels (expected 1)."
                )

        if dates_window.week_has_weekend_in_overlap(
            week.week_start,
            week.week_end,
            start_date,
            end_date,
        ):
            weekend_reel_count = weekend_reels_by_week.get(week.week_start, 0)
            if weekend_reel_count != 1:
                issues.append(
                    f"{week_label} has {weekend_reel_count} weekend reels (expected 1)."
                )

    return issues


def enrich_scheduler_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_scheduler_milestone_data(data):
        return data
    dates_window = _dates_window()
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    schedulable_weeks = [
        week.week_index
        for week in dates_window.campaign_weeks(start_date, end_date)
        if start_date
        and end_date
        and dates_window.week_requires_weekly_cadence(
            week.week_start,
            week.week_end,
            start_date,
            end_date,
        )
    ]
    enriched = dict(data)
    enriched["_evalHints"] = {
        "requiresStartDate": True,
        "requiresEndDate": True,
        "expectedCampaignWeeks": dates_window.count_campaign_weeks(start_date, end_date)
        if start_date and end_date
        else None,
        "schedulableCampaignWeekIndexes": schedulable_weeks,
        "expectedFourWeekBlocks": len(
            dates_window.interval_block_starts(start_date, end_date, interval_weeks=4)
        )
        if start_date and end_date
        else None,
        "cadenceIssues": _cadence_issues(data),
    }
    return enriched


def try_scheduler_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    normalized = _normalize_requirement(requirement)

    if not is_scheduler_milestone_data(data):
        return None

    issues = _cadence_issues(data)
    issues_text = "; ".join(issues)

    if "monthly" in normalized and "menu" in normalized and "highlight" in normalized:
        monthly_issues = [issue for issue in issues if "monthly menu highlight" in issue]
        if not monthly_issues:
            return (
                "pass",
                "Scheduler includes exactly one monthly menu highlight post in each 4-week block.",
            )
        return ("fail", issues_text or "Monthly menu highlight cadence is incomplete.")

    if "weekday" in normalized and "post" in normalized:
        post_issues = [issue for issue in issues if "weekday lunch posts" in issue]
        if not post_issues:
            return (
                "pass",
                "Each schedulable campaign week has exactly one weekday lunch post "
                "(monthly menu highlight posts in the same week are allowed).",
            )
        return ("fail", issues_text or "Weekday lunch post cadence is incomplete.")

    if "weekday" in normalized and "reel" in normalized:
        reel_issues = [issue for issue in issues if "weekday reels" in issue]
        if not reel_issues:
            return (
                "pass",
                "Each schedulable campaign week with a weekday in the window has "
                "exactly one weekday reel.",
            )
        return ("fail", issues_text or "Weekday reel cadence is incomplete.")

    if "weekend" in normalized and "reel" in normalized:
        reel_issues = [issue for issue in issues if "weekend reels" in issue]
        if not reel_issues:
            return (
                "pass",
                "Each schedulable campaign week with a weekend day in the window has "
                "exactly one weekend reel.",
            )
        return ("fail", issues_text or "Weekend reel cadence is incomplete.")

    return None
