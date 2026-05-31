"""Build Instagram feed post concepts from LLM group plans and menu clusterer data."""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Literal

POST_LINEUP_PINNED_POST_ID = "pinned-monthly-menu"
POST_LINEUP_WEEKLY_POST_ID = "weekday-lunch-post"
POST_LINEUP_MAX_SLIDES = 5
_DEFAULT_WEEKDAY_LUNCH_DAYS = ["tuesday"]
_DEFAULT_WEEKLY_POST_TIME = "10:00"


def _name_key(name: str) -> str:
    text = unicodedata.normalize("NFKC", str(name or "").strip())
    text = re.sub(r"\s+", " ", text)
    return text.casefold()


def _join_tag_values(values: Any, fallback: str) -> str:
    if not isinstance(values, list):
        return fallback
    cleaned = [str(value).strip() for value in values if str(value).strip()]
    return ", ".join(cleaned) if cleaned else fallback


def _build_image_brief_from_item(item: dict[str, Any]) -> str:
    name = str(item.get("name") or "").strip()
    raw_tags = item.get("tags")
    tags: dict[str, Any] = raw_tags if isinstance(raw_tags, dict) else {}
    texture = _join_tag_values(tags.get("texture"), "appetizing")
    prep_style = _join_tag_values(tags.get("prep_style"), "chef-prepared")
    reel_moment = str(tags.get("reel_moment") or item.get("reelMoment") or "").strip() or "hero"
    serve_temp = str(tags.get("serve_temp") or "").strip() or "fresh"

    return (
        f"High-quality appetizing food photography of {name}. "
        f"{texture} texture, {prep_style} presentation, served {serve_temp}. "
        f"Capture a {reel_moment} moment with hero framing, natural light, "
        f"and shallow depth of field."
    )


def _food_leads_by_name(food_leads: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_name: dict[str, dict[str, Any]] = {}
    for item in food_leads:
        if not isinstance(item, dict):
            continue
        key = _name_key(str(item.get("name") or ""))
        if key and key not in by_name:
            by_name[key] = item
    return by_name


def _overall_strategy(campaign_brief_data: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(campaign_brief_data, dict):
        return {}
    overall = campaign_brief_data.get("overallStrategy")
    return overall if isinstance(overall, dict) else {}


def _strategy_focus(campaign_brief_data: dict[str, Any] | None) -> str:
    overall = _overall_strategy(campaign_brief_data)
    raw = str(overall.get("strategyFocus") or "").strip().lower()
    if not raw:
        return "weekday_lunch"
    normalized = "_".join(raw.replace("-", " ").split())
    if "weekend" in normalized:
        return "weekend_family"
    if "evening" in normalized or "dinner" in normalized:
        return "evening_dinner"
    return "weekday_lunch"


def _weekly_post_schedule_hints(
    campaign_brief_data: dict[str, Any] | None,
) -> dict[str, Any]:
    focus = _strategy_focus(campaign_brief_data)
    if focus == "weekend_family":
        weekdays = ["friday", "sunday"]
        preferred_time = "09:30"
    elif focus == "evening_dinner":
        weekdays = ["wednesday", "friday"]
        preferred_time = "17:30"
    else:
        weekdays = list(_DEFAULT_WEEKDAY_LUNCH_DAYS)
        preferred_time = _DEFAULT_WEEKLY_POST_TIME
    return {
        "preferredWeekdays": weekdays,
        "preferredTime": preferred_time,
    }


def _groups_by_id(groups: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    for group in groups:
        if not isinstance(group, dict):
            continue
        group_id = str(group.get("id") or "").strip()
        if group_id:
            by_id[group_id] = group
    return by_id


def _slides_from_groups(
    selected_groups: list[dict[str, Any]],
    *,
    food_leads_by_name: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    slides: list[dict[str, Any]] = []
    seen_names: set[str] = set()

    for group in selected_groups:
        raw_items = group.get("items")
        if not isinstance(raw_items, list):
            continue
        for raw_item in raw_items:
            if len(slides) >= POST_LINEUP_MAX_SLIDES:
                return slides
            if not isinstance(raw_item, dict):
                continue
            name = str(raw_item.get("name") or "").strip()
            if not name:
                continue
            key = _name_key(name)
            if key in seen_names:
                continue
            seen_names.add(key)

            lookup = food_leads_by_name.get(key)
            if lookup is not None:
                image_brief = _build_image_brief_from_item(lookup)
            else:
                image_brief = _build_image_brief_from_item(raw_item)

            role = str(raw_item.get("role") or "").strip()
            category = str(raw_item.get("category") or "").strip()
            slide: dict[str, Any] = {
                "dishName": name,
                "imageBrief": image_brief,
            }
            if role in ("star", "puzzle"):
                slide["role"] = role
            if category:
                slide["category"] = category
            slides.append(slide)

    return slides


def _resolve_groups(group_ids: list[str], groups_by_id: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for group_id in group_ids:
        text = str(group_id or "").strip()
        if not text:
            continue
        group = groups_by_id.get(text)
        if group is None:
            raise ValueError(f"post_lineup plan references unknown group id {text!r}")
        selected.append(group)
    if not selected:
        raise ValueError("post_lineup plan must reference at least one group id")
    return selected


def _post_id_for_intent(intent: Literal["pinned_monthly_menu", "weekday_lunch_post"]) -> str:
    if intent == "pinned_monthly_menu":
        return POST_LINEUP_PINNED_POST_ID
    return POST_LINEUP_WEEKLY_POST_ID


def build_post_lineup_from_plan(
    *,
    monthly_post: dict[str, Any],
    weekly_post: dict[str, Any],
    groups: list[dict[str, Any]],
    food_leads: list[dict[str, Any]],
    campaign_brief_data: dict[str, Any],
    source_menu_clusterer_title: str = "",
    source_campaign_brief_title: str = "",
    notes: str = "",
) -> dict[str, Any]:
    if not groups:
        raise ValueError("post_lineup requires at least one menu clusterer group")

    groups_by_id = _groups_by_id(groups)
    food_leads_by_name = _food_leads_by_name(food_leads)
    posts: list[dict[str, Any]] = []

    for plan_post in (monthly_post, weekly_post):
        if not isinstance(plan_post, dict):
            raise ValueError("post_lineup plan post must be an object")
        intent_raw = str(plan_post.get("intent") or "").strip()
        if intent_raw not in ("pinned_monthly_menu", "weekday_lunch_post"):
            raise ValueError(f"post_lineup plan has invalid intent {intent_raw!r}")
        intent: Literal["pinned_monthly_menu", "weekday_lunch_post"] = intent_raw  # type: ignore[assignment]

        title = str(plan_post.get("title") or "").strip()
        if not title:
            raise ValueError(f"post_lineup plan for {intent} must include a non-empty title")

        raw_group_ids = plan_post.get("groupIds")
        if not isinstance(raw_group_ids, list):
            raise ValueError(f"post_lineup plan for {intent} must include groupIds")
        group_ids = [str(value).strip() for value in raw_group_ids if str(value).strip()]
        selected_groups = _resolve_groups(group_ids, groups_by_id)
        slides = _slides_from_groups(selected_groups, food_leads_by_name=food_leads_by_name)
        if not slides:
            raise ValueError(f"post_lineup plan for {intent} produced no slides from selected groups")

        post: dict[str, Any] = {
            "id": _post_id_for_intent(intent),
            "format": "carousel",
            "intent": intent,
            "title": title,
            "slides": slides,
            "groupIds": group_ids,
        }
        if intent == "weekday_lunch_post":
            post["scheduleHints"] = _weekly_post_schedule_hints(campaign_brief_data)
        posts.append(post)

    payload: dict[str, Any] = {"posts": posts}
    source_clusterer_title = source_menu_clusterer_title.strip()
    if source_clusterer_title:
        payload["sourceMenuClustererTitle"] = source_clusterer_title
    source_brief_title = source_campaign_brief_title.strip()
    if source_brief_title:
        payload["sourceCampaignBriefTitle"] = source_brief_title
    owner_notes = notes.strip()
    if owner_notes:
        payload["notes"] = owner_notes
    return payload
