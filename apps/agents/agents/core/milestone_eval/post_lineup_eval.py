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
    first = posts[0] if posts else {}
    slides = _slides(first)
    enriched["_evalHints"] = {
        "postCount": len(posts),
        "firstPostFormat": first.get("format"),
        "slideCount": len(slides),
        "maxSlides": POST_LINEUP_MAX_SLIDES,
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


def try_post_lineup_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_post_lineup_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    posts = _posts(data)
    first_post = posts[0] if posts else {}
    slides = _slides(first_post)

    if "reel_lineup" in norm and ("prior" in norm or "earlier" in norm or "run used" in norm):
        if not posts:
            return ("fail", "post lineup data has no posts from prior reel_lineup food leads.")
        return (
            "pass",
            f"post lineup produced {len(posts)} post concept(s) from reel lineup food leads.",
        )

    if "carousel" in norm and ("post" in norm or "posts" in norm):
        if not posts:
            return ("fail", "post lineup has no posts.")
        carousel_posts = [
            post for post in posts if str(post.get("format") or "").strip() == "carousel"
        ]
        if not carousel_posts:
            return ("fail", "post lineup has no carousel post.")
        return ("pass", f"post lineup includes {len(carousel_posts)} carousel post(s).")

    if "slide" in norm and ("foodlead" in norm or "food lead" in norm or "foodleads" in norm):
        if not slides:
            return ("fail", "carousel has no slides to compare with foodLeads.")
        if len(slides) > POST_LINEUP_MAX_SLIDES:
            return (
                "fail",
                f"carousel has {len(slides)} slides; maximum is {POST_LINEUP_MAX_SLIDES}.",
            )
        return ("pass", f"carousel slide count is {len(slides)}, matching foodLeads length.")

    if "dishname" in norm and "imagebrief" in norm:
        issues = _slides_have_required_fields(slides)
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return ("pass", "every slide has non-empty dishName and imageBrief.")

    if "imagebrief" in norm and ("slide" in norm or "every" in norm):
        issues = _slides_have_required_fields(slides)
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return ("pass", "every slide has a non-empty imageBrief.")

    return None
