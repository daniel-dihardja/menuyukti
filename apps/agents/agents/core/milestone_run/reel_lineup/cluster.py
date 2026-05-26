"""Build reel lineup hook groups from menu tagger items."""

from __future__ import annotations

import contextlib
from typing import Any, Literal

REEL_LINEUP_PROFILE_ID: Literal["hook_reel"] = "hook_reel"
REEL_LINEUP_MAX_LEADS = 5
REEL_LINEUP_MAX_DRINK_LEADS = 3
_DEFAULT_STRATEGY_FOCUS = "weekday_lunch"
_DEFAULT_CORE_MESSAGE = "Weekday lunch offer for nearby workers and small groups."
_DEFAULT_OFFER_WINDOW = "11:00-14:00"
_DEFAULT_WEEKDAY_LUNCH_DAYS = ["tuesday", "thursday"]
_DEFAULT_WEEKDAY_LUNCH_TIME = "11:00"
_DEFAULT_WEEKEND_TIME = "09:30"
_DEFAULT_EVENING_TIME = "17:30"
_CREATIVE_ROLE_SEQUENCE = (
    "hero",
    "proof",
    "variety",
    "value",
    "group_lunch_angle",
)


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


def _overall_strategy(campaign_brief_data: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(campaign_brief_data, dict):
        return {}
    overall = campaign_brief_data.get("overallStrategy")
    return overall if isinstance(overall, dict) else {}


def _strategy_focus(campaign_brief_data: dict[str, Any] | None) -> str:
    overall = _overall_strategy(campaign_brief_data)
    return str(overall.get("strategyFocus") or "").strip() or _DEFAULT_STRATEGY_FOCUS


def _core_message(campaign_brief_data: dict[str, Any] | None) -> str:
    overall = _overall_strategy(campaign_brief_data)
    return str(overall.get("coreMessage") or "").strip() or _DEFAULT_CORE_MESSAGE


def _offer_window(campaign_brief_data: dict[str, Any] | None) -> str:
    overall = _overall_strategy(campaign_brief_data)
    return str(overall.get("offerWindow") or "").strip() or _DEFAULT_OFFER_WINDOW


def _preferred_weekdays_for_focus(focus: str) -> list[str]:
    normalized = focus.strip().lower()
    if normalized == "weekend_family":
        return ["friday", "sunday"]
    if normalized == "evening_dinner":
        return ["wednesday", "friday"]
    return list(_DEFAULT_WEEKDAY_LUNCH_DAYS)


def _preferred_time_for_focus(focus: str) -> str:
    normalized = focus.strip().lower()
    if normalized == "weekend_family":
        return _DEFAULT_WEEKEND_TIME
    if normalized == "evening_dinner":
        return _DEFAULT_EVENING_TIME
    return _DEFAULT_WEEKDAY_LUNCH_TIME


def _creative_role_for_index(index: int) -> str:
    if index < len(_CREATIVE_ROLE_SEQUENCE):
        return _CREATIVE_ROLE_SEQUENCE[index]
    return _CREATIVE_ROLE_SEQUENCE[-1]


def _build_asset_hint(item: dict[str, Any], *, offer_window: str) -> str:
    raw_tags = item.get("tags")
    tags: dict[str, Any] = raw_tags if isinstance(raw_tags, dict) else {}
    name = str(item.get("name") or "").strip() or "the hero dish"
    reel_moment = str(tags.get("reel_moment") or "").strip() or "hero moment"
    prep_style = tags.get("prep_style")
    prep_hint = ""
    if isinstance(prep_style, list) and prep_style:
        prep_hint = f" Show the {' / '.join(str(value).strip() for value in prep_style if str(value).strip())} prep."
    return (
        f"Keep the lunch CTA consistent for {offer_window}; rotate visuals with a {reel_moment} shot of {name}."
        f"{prep_hint}"
    ).strip()


def _finalize_lead_group(
    item: dict[str, Any],
    index: int,
    *,
    id_prefix: str,
    campaign_brief_data: dict[str, Any] | None,
    enrich_strategy: bool,
) -> dict[str, Any]:
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

    group: dict[str, Any] = {
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
    if enrich_strategy:
        focus = _strategy_focus(campaign_brief_data)
        offer_window = _offer_window(campaign_brief_data)
        group["strategyFocus"] = focus
        group["coreMessage"] = _core_message(campaign_brief_data)
        group["creativeRole"] = _creative_role_for_index(index)
        group["assetHint"] = _build_asset_hint(item, offer_window=offer_window)
        group["scheduleHints"] = {
            "preferredWeekdays": _preferred_weekdays_for_focus(focus),
            "preferredTime": _preferred_time_for_focus(focus),
            "cadenceEligible": True,
        }
    return group


def build_reel_lineup(
    *,
    menu_tagger_items: list[dict[str, Any]],
    campaign_brief_data: dict[str, Any] | None = None,
    source_menu_tagger_title: str = "",
    source_campaign_brief_title: str = "",
    notes: str = "",
) -> dict[str, Any]:
    food_leads = [item for item in menu_tagger_items if _is_main_course_strong_story(item)][
        :REEL_LINEUP_MAX_LEADS
    ]

    drink_leads = [item for item in menu_tagger_items if _is_beverage_drink(item)][
        :REEL_LINEUP_MAX_DRINK_LEADS
    ]

    assigned_names = {
        str(item.get("name") or "").strip()
        for item in [*food_leads, *drink_leads]
        if str(item.get("name") or "").strip()
    }
    unassigned_item_names = [
        str(item.get("name") or "").strip()
        for item in menu_tagger_items
        if str(item.get("name") or "").strip()
        and str(item.get("name") or "").strip() not in assigned_names
    ]

    payload: dict[str, Any] = {
        "foodLeads": food_leads,
        "drinkLeads": drink_leads,
        "groups": [
            _finalize_lead_group(
                item,
                index,
                id_prefix="group",
                campaign_brief_data=campaign_brief_data,
                enrich_strategy=True,
            )
            for index, item in enumerate(food_leads)
        ],
        "drinkGroups": [
            _finalize_lead_group(
                item,
                index,
                id_prefix="drink-group",
                campaign_brief_data=campaign_brief_data,
                enrich_strategy=False,
            )
            for index, item in enumerate(drink_leads)
        ],
        "unassignedItemNames": unassigned_item_names,
    }
    title = source_menu_tagger_title.strip()
    if title:
        payload["sourceMenuTaggerTitle"] = title
    campaign_title = source_campaign_brief_title.strip()
    if campaign_title:
        payload["sourceCampaignBriefTitle"] = campaign_title
    note_text = notes.strip()
    if note_text:
        payload["notes"] = note_text
    return payload
