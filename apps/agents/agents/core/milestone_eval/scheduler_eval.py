"""Deterministic pass/fail checks for scheduler milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

POST_TOP_FIVE_ID_PREFIX = "top-five-"
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


def _classify_post_slot(slot: dict[str, Any]) -> Literal["top_five", "weekday", "other", ""]:
    post = slot.get("post")
    if not isinstance(post, dict):
        return ""
    post_id = str(post.get("id") or "").strip()
    intent = str(post.get("intent") or "").strip()
    if post_id.startswith(POST_TOP_FIVE_ID_PREFIX) or intent == "top_five_category":
        return "top_five"
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

    top_five_dated: list[tuple[str, str]] = []
    weekday_posts_by_week: dict[str, int] = {week.week_start: 0 for week in weeks}
    weekday_reels_by_week: dict[str, int] = {week.week_start: 0 for week in weeks}
    weekend_reels_by_week: dict[str, int] = {week.week_start: 0 for week in weeks}

    for slot in _slots(data):
        iso_date = str(slot.get("date") or "").strip()
        if dates_window.parse_iso_date(iso_date) is None:
            continue

        post_kind = _classify_post_slot(slot)
        if post_kind == "top_five":
            post = slot.get("post")
            post_id = ""
            if isinstance(post, dict):
                post_id = str(post.get("id") or "").strip()
            if post_id:
                top_five_dated.append((iso_date, post_id))
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

    issues = dates_window.top_five_cadence_issues(
        dated_post_ids=top_five_dated,
        start_date=start_date,
        end_date=end_date,
    )

    has_weekday_lunch_posts = any(count > 0 for count in weekday_posts_by_week.values())
    has_weekday_reels = any(count > 0 for count in weekday_reels_by_week.values())
    has_weekend_reels = any(count > 0 for count in weekend_reels_by_week.values())

    for week in weeks:
        week_label = f"campaign week {week.week_index}"
        if not dates_window.week_requires_weekly_cadence(
            week.week_start,
            week.week_end,
            start_date,
            end_date,
        ):
            continue

        if has_weekday_lunch_posts:
            post_count = weekday_posts_by_week.get(week.week_start, 0)
            if post_count != 1:
                issues.append(
                    f"{week_label} has {post_count} weekday lunch posts (expected 1; "
                    "top_five_category posts in the same week are allowed)."
                )

        if has_weekday_reels and dates_window.week_has_weekday_in_overlap(
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

        if has_weekend_reels and dates_window.week_has_weekend_in_overlap(
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
        "expectedTopFiveCategoryBlocks": len(
            dates_window.interval_block_starts(
                start_date,
                end_date,
                interval_weeks=dates_window.TOP_FIVE_CATEGORY_INTERVAL_WEEKS,
            )
        )
        if start_date and end_date
        else None,
        "topFiveCategoryIntervalWeeks": dates_window.TOP_FIVE_CATEGORY_INTERVAL_WEEKS,
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

    interval_weeks = _dates_window().TOP_FIVE_CATEGORY_INTERVAL_WEEKS
    top_five_issue_markers = (
        f"{interval_weeks}-week block",
        "top_five_category posts on",
        "top_five_category posts must rotate",
    )

    if ("top_five" in normalized or "top five" in normalized) and (
        "block" in normalized or "rotate" in normalized or "every" in normalized
    ):
        top_five_issues = [
            issue
            for issue in issues
            if any(marker in issue for marker in top_five_issue_markers)
        ]
        if not top_five_issues:
            return (
                "pass",
                f"Scheduler publishes one top_five_category post every {interval_weeks} weeks, "
                "rotating through lineup posts.",
            )
        return ("fail", issues_text or "Top five category post cadence is incomplete.")

    if "monthly" in normalized and "menu" in normalized and "highlight" in normalized:
        top_five_issues = [
            issue
            for issue in issues
            if any(marker in issue for marker in top_five_issue_markers)
        ]
        if not top_five_issues:
            return (
                "pass",
                f"Scheduler publishes one top_five_category post every {interval_weeks} weeks, "
                "rotating through lineup posts.",
            )
        return ("fail", issues_text or "Top five category post cadence is incomplete.")

    if "weekday" in normalized and "post" in normalized:
        has_weekday_lunch_posts = any(
            _classify_post_slot(slot) == "weekday" for slot in _slots(data)
        )
        if not has_weekday_lunch_posts:
            return (
                "pass",
                "No weekday lunch posts in the lineup; weekday post cadence is not required.",
            )
        post_issues = [issue for issue in issues if "weekday lunch posts" in issue]
        if not post_issues:
            return (
                "pass",
                "Each schedulable campaign week has exactly one weekday lunch post "
                "(top_five_category posts in the same week are allowed).",
            )
        return ("fail", issues_text or "Weekday lunch post cadence is incomplete.")

    if "weekday" in normalized and "reel" in normalized:
        has_weekday_reels = any(_classify_reel_slot(slot) == "weekday" for slot in _slots(data))
        if not has_weekday_reels:
            return (
                "pass",
                "No weekday reels in the lineup; weekday reel cadence is not required.",
            )
        reel_issues = [issue for issue in issues if "weekday reels" in issue]
        if not reel_issues:
            return (
                "pass",
                "Each schedulable campaign week with a weekday in the window has "
                "exactly one weekday reel.",
            )
        return ("fail", issues_text or "Weekday reel cadence is incomplete.")

    if "weekend" in normalized and "reel" in normalized:
        has_weekend_reels = any(_classify_reel_slot(slot) == "weekend" for slot in _slots(data))
        if not has_weekend_reels:
            return (
                "pass",
                "No weekend reels in the lineup; weekend reel cadence is not required.",
            )
        reel_issues = [issue for issue in issues if "weekend reels" in issue]
        if not reel_issues:
            return (
                "pass",
                "Each schedulable campaign week with a weekend day in the window has "
                "exactly one weekend reel.",
            )
        return ("fail", issues_text or "Weekend reel cadence is incomplete.")

    return None
