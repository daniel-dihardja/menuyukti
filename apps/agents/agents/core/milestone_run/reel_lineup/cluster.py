"""Build reel lineup hook groups from menu tagger items."""

from __future__ import annotations

import contextlib
from typing import Any, Literal

REEL_LINEUP_PROFILE_ID: Literal["hook_reel"] = "hook_reel"
REEL_LINEUP_MAX_LEADS = 5
REEL_LINEUP_MAX_DRINK_LEADS = 3


def _is_main_course_strong_story(item: dict[str, Any]) -> bool:
    if str(item.get("storytellingFit") or "weak").strip().lower() != "strong":
        return False
    tags = item.get("tags")
    if not isinstance(tags, dict):
        return False
    if str(tags.get("kind") or "").strip() != "food":
        return False
    course = tags.get("course")
    if not isinstance(course, list):
        return False
    return "main" in [str(value).strip() for value in course]


def _is_beverage_drink(item: dict[str, Any]) -> bool:
    tags = item.get("tags")
    if not isinstance(tags, dict):
        return False
    if str(tags.get("kind") or "").strip() != "drink":
        return False
    course = tags.get("course")
    if not isinstance(course, list):
        return False
    return "beverage" in [str(value).strip() for value in course]


def _finalize_lead_group(item: dict[str, Any], index: int, *, id_prefix: str) -> dict[str, Any]:
    raw_tags = item.get("tags")
    tags: dict[str, Any] = raw_tags if isinstance(raw_tags, dict) else {}
    reel_moment = str(tags.get("reel_moment") or "").strip() or "static_hero"
    role = str(item.get("role") or "star").strip()
    storytelling_fit = str(item.get("storytellingFit") or "weak").strip().lower()
    group_item: dict[str, Any] = {
        "name": str(item.get("name") or "").strip(),
        "role": role if role in ("star", "puzzle") else "star",
        "category": str(item.get("category") or "").strip() or "(uncategorized)",
        "position": 1,
        "storytellingFit": "strong" if storytelling_fit == "strong" else "weak",
        "reelMoment": reel_moment,
    }
    popularity_raw = item.get("popularity")
    if popularity_raw is not None and popularity_raw != "":
        with contextlib.suppress(TypeError, ValueError):
            group_item["popularity"] = float(popularity_raw)

    strong_story_count = 1 if storytelling_fit == "strong" else 0

    return {
        "id": f"{id_prefix}-{index + 1}",
        "leadName": group_item["name"],
        "profileId": REEL_LINEUP_PROFILE_ID,
        "anchor": {"dimension": "reel_moment", "value": reel_moment},
        "items": [group_item],
        "mix": {
            "priceLevels": [],
            "storytellingStrongCount": strong_story_count,
            "starCount": 1 if group_item["role"] == "star" else 0,
            "puzzleCount": 1 if group_item["role"] == "puzzle" else 0,
        },
    }


def build_reel_lineup(
    *,
    menu_tagger_items: list[dict[str, Any]],
    source_menu_tagger_title: str = "",
    notes: str = "",
) -> dict[str, Any]:
    food_leads = [
        item for item in menu_tagger_items if _is_main_course_strong_story(item)
    ][:REEL_LINEUP_MAX_LEADS]

    drink_leads = [
        item for item in menu_tagger_items if _is_beverage_drink(item)
    ][:REEL_LINEUP_MAX_DRINK_LEADS]

    assigned_names = {
        str(item.get("name") or "").strip()
        for item in [*food_leads, *drink_leads]
        if str(item.get("name") or "").strip()
    }
    unassigned_item_names = [
        str(item.get("name") or "").strip()
        for item in menu_tagger_items
        if str(item.get("name") or "").strip() and str(item.get("name") or "").strip() not in assigned_names
    ]

    payload: dict[str, Any] = {
        "foodLeads": food_leads,
        "drinkLeads": drink_leads,
        "groups": [
            _finalize_lead_group(item, index, id_prefix="group") for index, item in enumerate(food_leads)
        ],
        "drinkGroups": [
            _finalize_lead_group(item, index, id_prefix="drink-group")
            for index, item in enumerate(drink_leads)
        ],
        "unassignedItemNames": unassigned_item_names,
    }
    title = source_menu_tagger_title.strip()
    if title:
        payload["sourceMenuTaggerTitle"] = title
    note_text = notes.strip()
    if note_text:
        payload["notes"] = note_text
    return payload
