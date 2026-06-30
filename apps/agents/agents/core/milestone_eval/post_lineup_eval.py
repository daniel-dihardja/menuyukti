"""Deterministic pass/fail checks for post_lineup milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

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
    enriched["_evalHints"] = {
        "postCount": len(posts),
        "intents": intents,
        "slideCounts": slide_counts,
        "maxSlides": POST_LINEUP_MAX_SLIDES,
        "topFivePostCount": len(_top_five_posts(posts)),
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


def _top_five_posts(posts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [post for post in posts if str(post.get("intent") or "").strip() == "top_five_category"]


def _slides_have_required_fields(
    slides: list[dict[str, Any]],
    *,
    require_caption: bool,
) -> list[str]:
    issues: list[str] = []
    for index, slide in enumerate(slides, start=1):
        dish_name = str(slide.get("dishName") or "").strip()
        image_brief = str(slide.get("imageBrief") or "").strip()
        if not dish_name:
            issues.append(f"slide {index} is missing dishName")
        if not image_brief:
            issues.append(f"slide {index} is missing imageBrief")
        if require_caption and not str(slide.get("caption") or "").strip():
            issues.append(f"slide {index} is missing caption")
    return issues


def _all_slides_have_required_fields(posts: list[dict[str, Any]]) -> list[str]:
    issues: list[str] = []
    for post_index, post in enumerate(posts, start=1):
        intent = str(post.get("intent") or "").strip()
        require_caption = intent == "top_five_category"
        for issue in _slides_have_required_fields(
            _slides(post),
            require_caption=require_caption,
        ):
            issues.append(f"post {post_index}: {issue}")
    return issues


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

    if ("menu_tagger" in norm or "menu tagger" in norm) and (
        "prior" in norm or "earlier" in norm or "run used" in norm
    ):
        if not _top_five_posts(posts) and not str(data.get("sourceMenuTaggerTitle") or "").strip():
            return ("fail", "post lineup data has no top five posts from prior menu tagger items.")
        return (
            "pass",
            "post lineup used prior menu_tagger milestone for Top 5 category posts.",
        )

    if ("menu_clusterer" in norm or "menu clusterer" in norm) and (
        "prior" in norm or "earlier" in norm or "run used" in norm
    ):
        return (
            "pass",
            "post lineup no longer requires menu clusterer; Top 5 posts are sourced from menu tagger.",
        )

    if "carousel" in norm and ("post" in norm or "posts" in norm):
        top_five_posts = _top_five_posts(posts)
        if not top_five_posts:
            return ("fail", "post lineup must include at least one top_five_category post.")
        carousel_posts = [
            post for post in posts if str(post.get("format") or "").strip() == "carousel"
        ]
        if len(carousel_posts) != len(posts):
            return ("fail", "post lineup posts must all be carousel format.")
        return ("pass", "post lineup includes Top 5 carousel posts per star category.")

    if "fixdate" in norm and "date" in norm:
        return (
            "pass",
            "top_five_category posts use interval scheduling; fixdate applies to other milestones only.",
        )

    if "slide" in norm and ("1" in norm or "5" in norm or "count" in norm):
        if not posts:
            return ("fail", "post lineup has no posts with slides.")
        for post in posts:
            slides = _slides(post)
            if not slides:
                return ("fail", "a post has no slides.")
            if len(slides) > POST_LINEUP_MAX_SLIDES:
                return (
                    "fail",
                    f"a post has {len(slides)} slides; maximum is {POST_LINEUP_MAX_SLIDES}.",
                )
        return ("pass", "each post has between 1 and 5 slides.")

    if "dishname" in norm and "imagebrief" in norm:
        issues = _all_slides_have_required_fields(posts)
        if issues:
            return ("fail", "; ".join(issues[:4]))
        if "caption" in norm:
            return (
                "pass",
                "every slide has non-empty dishName, imageBrief, and top_five_category slides have caption.",
            )
        return ("pass", "every slide has non-empty dishName and imageBrief.")

    if "imagebrief" in norm and ("slide" in norm or "every" in norm):
        issues = _all_slides_have_required_fields(posts)
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return ("pass", "every slide has a non-empty imageBrief.")

    return None
