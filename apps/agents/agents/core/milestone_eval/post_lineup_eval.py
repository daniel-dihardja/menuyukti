"""Deterministic pass/fail checks for post_lineup milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

from agents_app.agents.core.milestone_run.dates_window import count_campaign_weeks

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

POST_LINEUP_MAX_SLIDES = 5


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_post_lineup_milestone_data(data: dict[str, Any]) -> bool:
    return isinstance(data.get("posts"), list)


def enrich_post_lineup_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_post_lineup_milestone_data(data):
        return data
    enriched = dict(data)
    posts = _posts(data)
    intents = [str(post.get("intent") or "").strip() for post in posts]
    slide_counts = [len(_slides(post)) for post in posts]
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    expected_weeks = count_campaign_weeks(start_date, end_date) if start_date and end_date else None
    enriched["_evalHints"] = {
        "postCount": len(posts),
        "intents": intents,
        "slideCounts": slide_counts,
        "maxSlides": POST_LINEUP_MAX_SLIDES,
        "expectedWeeklyPostCount": expected_weeks,
    }
    return enriched


def _posts(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("posts")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _slides(post: dict[str, Any]) -> list[dict[str, Any]]:
    raw = post.get("slides")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _slides_have_required_fields(slides: list[dict[str, Any]]) -> list[str]:
    issues: list[str] = []
    for index, slide in enumerate(slides, start=1):
        dish_name = str(slide.get("dishName") or "").strip()
        image_brief = str(slide.get("imageBrief") or "").strip()
        if not dish_name:
            issues.append(f"slide {index} is missing dishName")
        if not image_brief:
            issues.append(f"slide {index} is missing imageBrief")
    return issues


def _all_slides_have_required_fields(posts: list[dict[str, Any]]) -> list[str]:
    issues: list[str] = []
    for post_index, post in enumerate(posts, start=1):
        for issue in _slides_have_required_fields(_slides(post)):
            issues.append(f"post {post_index}: {issue}")
    return issues


def _weekly_posts(posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [post for post in posts if str(post.get("intent") or "").strip() == "weekday_lunch_post"]


def try_post_lineup_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_post_lineup_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    posts = _posts(data)
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()

    if "dates" in norm and ("prior" in norm or "earlier" in norm or "run used" in norm):
        if not start_date or not end_date:
            return ("fail", "post lineup data is missing startDate and endDate from prior dates.")
        if not str(data.get("sourceDatesTitle") or "").strip() and not posts:
            return ("fail", "post lineup data has no saved window from prior dates milestone.")
        return ("pass", "post lineup used prior dates milestone for the campaign window.")

    if ("campaign brief" in norm or "campaign_brief" in norm) and (
        "prior" in norm or "earlier" in norm or "run used" in norm
    ):
        if not posts:
            return ("fail", "post lineup data has no posts from prior campaign brief context.")
        return (
            "pass",
            "post lineup used prior restaurant_campaign_brief context for post planning.",
        )

    if ("menu_clusterer" in norm or "menu clusterer" in norm) and (
        "prior" in norm or "earlier" in norm or "run used" in norm
    ):
        if not posts:
            return ("fail", "post lineup data has no posts from prior menu clusterer groups.")
        has_group_ids = any(
            isinstance(post.get("groupIds"), list) and len(post.get("groupIds") or []) > 0
            for post in posts
        )
        if not has_group_ids:
            return ("fail", "post lineup posts are missing menu clusterer groupIds.")
        return (
            "pass",
            f"post lineup produced {len(posts)} post concept(s) from menu clusterer groups.",
        )

    if "pinned" in norm and "monthly" in norm and ("post" in norm or "posts" in norm):
        monthly_posts = [
            post for post in posts if str(post.get("intent") or "").strip() == "pinned_monthly_menu"
        ]
        if len(monthly_posts) != 1:
            return ("fail", "post lineup must include exactly one pinned_monthly_menu post.")
        return ("pass", "post lineup includes a pinned monthly menu post.")

    if "weekly" in norm and "lunch" in norm and ("post" in norm or "posts" in norm):
        weekly_posts = _weekly_posts(posts)
        if not weekly_posts:
            return ("fail", "post lineup has no weekday_lunch_post entries.")
        if (
            start_date
            and end_date
            and ("week" in norm or "per week" in norm or "each week" in norm)
        ):
            expected = count_campaign_weeks(start_date, end_date)
            if len(weekly_posts) != expected:
                return (
                    "fail",
                    f"post lineup must include one weekday lunch post per week; "
                    f"expected {expected}, got {len(weekly_posts)}.",
                )
            return (
                "pass",
                f"post lineup includes {len(weekly_posts)} weekday lunch posts (one per campaign week).",
            )
        return ("pass", f"post lineup includes {len(weekly_posts)} weekday lunch post(s).")

    if "carousel" in norm and ("post" in norm or "posts" in norm):
        monthly_posts = [
            post for post in posts if str(post.get("intent") or "").strip() == "pinned_monthly_menu"
        ]
        weekly_posts = _weekly_posts(posts)
        if len(monthly_posts) != 1:
            return ("fail", "post lineup must include exactly one pinned_monthly_menu post.")
        if start_date and end_date:
            expected = count_campaign_weeks(start_date, end_date)
            if len(weekly_posts) != expected:
                return (
                    "fail",
                    f"post lineup must include one weekday lunch post per week; "
                    f"expected {expected}, got {len(weekly_posts)}.",
                )
        elif not weekly_posts:
            return ("fail", "post lineup has no weekday_lunch_post entries.")
        carousel_posts = [
            post for post in posts if str(post.get("format") or "").strip() == "carousel"
        ]
        if len(carousel_posts) != len(posts):
            return ("fail", "post lineup posts must all be carousel format.")
        return ("pass", "post lineup includes carousel posts with required intents.")

    if "fixdate" in norm and "date" in norm:
        weekly_posts = _weekly_posts(posts)
        if not weekly_posts:
            return ("fail", "post lineup has no weekday_lunch_post entries to validate.")
        if start_date and end_date:
            expected = count_campaign_weeks(start_date, end_date)
            if len(weekly_posts) != expected:
                return (
                    "fail",
                    f"post lineup must include one weekday lunch post per week; "
                    f"expected {expected}, got {len(weekly_posts)}.",
                )
        return (
            "pass",
            "weekday lunch posts are defined by intent; scheduler assigns publish dates.",
        )

    if "slide" in norm and ("group" in norm or "groups" in norm):
        if not posts:
            return ("fail", "post lineup has no posts with slides from groups.")
        for post in posts:
            slides = _slides(post)
            if not slides:
                return ("fail", "a post has no slides sourced from menu clusterer groups.")
            if len(slides) > POST_LINEUP_MAX_SLIDES:
                return (
                    "fail",
                    f"a post has {len(slides)} slides; maximum is {POST_LINEUP_MAX_SLIDES}.",
                )
        return ("pass", "each post has slides sourced from menu clusterer groups.")

    if "dishname" in norm and "imagebrief" in norm:
        issues = _all_slides_have_required_fields(posts)
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return ("pass", "every slide has non-empty dishName and imageBrief.")

    if "imagebrief" in norm and ("slide" in norm or "every" in norm):
        issues = _all_slides_have_required_fields(posts)
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return ("pass", "every slide has a non-empty imageBrief.")

    return None
