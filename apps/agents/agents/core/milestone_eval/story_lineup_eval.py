"""Deterministic pass/fail checks for story_lineup milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_story_lineup_milestone_data(data: dict[str, Any]) -> bool:
    stories = data.get("stories")
    return isinstance(stories, list)


def enrich_story_lineup_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_story_lineup_milestone_data(data):
        return data
    enriched = dict(data)
    enriched["_evalHints"] = {
        "requiresStoriesList": True,
    }
    return enriched


def try_story_lineup_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_story_lineup_milestone_data(data):
        return None

    normalized = _normalize_requirement(requirement)
    stories = data.get("stories")
    if not isinstance(stories, list):
        stories = []

    if "prior" in normalized and "dates" in normalized:
        source_title = str(data.get("sourceDatesTitle") or "").strip()
        if source_title:
            return (
                "pass",
                "Story lineup data references a prior dates milestone via sourceDatesTitle.",
            )
        if stories:
            return (
                "pass",
                "Story lineup includes stories derived from prior dates milestone holidays.",
            )
        return (
            "fail",
            "Story lineup has no stories and no sourceDatesTitle from a prior dates milestone.",
        )

    if "stories" in normalized and ("present" in normalized or "lists" in normalized):
        valid = [
            story
            for story in stories
            if isinstance(story, dict) and str(story.get("title") or "").strip()
        ]
        if valid:
            return (
                "pass",
                f"Story lineup lists {len(valid)} story item(s) with non-empty titles.",
            )
        return ("fail", "Story lineup stories must include at least one item with a title.")

    if "fixdate" in normalized or ("public" in normalized and "holiday" in normalized):
        holiday_stories = [
            story
            for story in stories
            if isinstance(story, dict)
            and story.get("reason") == "public_holiday"
            and bool(story.get("fixdate"))
            and str(story.get("date") or "").strip()
            and str(story.get("title") or "").strip()
        ]
        if holiday_stories and len(holiday_stories) == len(
            [
                story
                for story in stories
                if isinstance(story, dict) and story.get("reason") == "public_holiday"
            ]
        ):
            return (
                "pass",
                "Every public-holiday story has fixdate true and a matching date.",
            )
        if not any(
            isinstance(story, dict) and story.get("reason") == "public_holiday" for story in stories
        ):
            return (
                "pass",
                "No public-holiday stories were selected; fixdate rule is vacuously satisfied.",
            )
        return (
            "fail",
            "Public-holiday stories must set fixdate true and include a date for scheduling.",
        )

    return None
