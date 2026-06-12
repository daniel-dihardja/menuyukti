"""Build Instagram feed post concepts from LLM group plans and menu clusterer data."""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Literal

from agents_app.agents.core.milestone_run.dates_window import (
    CampaignWeek,
    preferred_time_for_strategy,
    preferred_weekdays_for_strategy,
)
from agents_app.agents.core.milestone_run.menu_clusterer.cluster import (
    MENU_CLUSTERER_PROFILE_MENU_HIGHLIGHT,
    sort_items_by_popularity,
)

POST_LINEUP_PINNED_POST_ID = "pinned-monthly-menu"
POST_LINEUP_WEEKLY_POST_ID_PREFIX = "weekday-lunch-post-week"
POST_LINEUP_MAX_SLIDES = 5


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


def _optional_storytelling_fit(item: dict[str, Any]) -> Literal["strong", "weak"] | None:
    raw = item.get("storytellingFit")
    if raw in ("strong", "weak"):
        return raw
    return None


def _optional_popularity(item: dict[str, Any]) -> float | None:
    raw = item.get("popularity")
    if isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        value = float(raw)
        if 0 <= value <= 1:
            return value
    return None


def _slide_metrics_from_item(
    item: dict[str, Any],
    lookup: dict[str, Any] | None,
) -> dict[str, Any]:
    metrics: dict[str, Any] = {}
    fit = _optional_storytelling_fit(item)
    if fit is None and lookup is not None:
        fit = _optional_storytelling_fit(lookup)
    if fit is not None:
        metrics["storytellingFit"] = fit
    popularity = _optional_popularity(item)
    if popularity is None and lookup is not None:
        popularity = _optional_popularity(lookup)
    if popularity is not None:
        metrics["popularity"] = popularity
    return metrics


def _food_leads_by_name(food_leads: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_name: dict[str, dict[str, Any]] = {}
    for item in food_leads:
        if not isinstance(item, dict):
            continue
        key = _name_key(str(item.get("name") or ""))
        if key and key not in by_name:
            by_name[key] = item
    return by_name


def _groups_by_id(groups: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    for group in groups:
        if not isinstance(group, dict):
            continue
        group_id = str(group.get("id") or "").strip()
        if group_id:
            by_id[group_id] = group
    return by_id


def _creative_role(group: dict[str, Any]) -> str:
    return str(group.get("creativeRole") or "").strip().lower()


def _is_menu_highlight_group(group: dict[str, Any]) -> bool:
    return str(group.get("profileId") or "").strip() == MENU_CLUSTERER_PROFILE_MENU_HIGHLIGHT


def _menu_highlight_group_ids_in_order(groups: list[dict[str, Any]]) -> list[str]:
    ids: list[str] = []
    for group in groups:
        if not isinstance(group, dict):
            continue
        group_id = str(group.get("id") or "").strip()
        if group_id and _is_menu_highlight_group(group):
            ids.append(group_id)
    return ids


def _is_static_hero_group(group: dict[str, Any]) -> bool:
    anchor = group.get("anchor")
    if isinstance(anchor, dict):
        dimension = str(anchor.get("dimension") or "").strip()
        value = str(anchor.get("value") or "").strip().lower()
        if dimension == "reel_moment" and value == "static_hero":
            return True
    raw_items = group.get("items")
    if isinstance(raw_items, list):
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            if str(item.get("reelMoment") or "").strip().lower() == "static_hero":
                return True
    return False


def _static_hero_group_ids_in_order(groups: list[dict[str, Any]]) -> list[str]:
    ids: list[str] = []
    for group in groups:
        if not isinstance(group, dict):
            continue
        group_id = str(group.get("id") or "").strip()
        if group_id and _is_static_hero_group(group):
            ids.append(group_id)
    return ids


def _hero_creative_role_group_ids_in_order(groups: list[dict[str, Any]]) -> list[str]:
    ids: list[str] = []
    for group in groups:
        if not isinstance(group, dict):
            continue
        group_id = str(group.get("id") or "").strip()
        if group_id and _creative_role(group) == "hero":
            ids.append(group_id)
    return ids


def validate_monthly_pin_groups(groups: list[dict[str, Any]]) -> None:
    """Fail fast when menu clusterer output cannot satisfy the monthly pin."""
    if _menu_highlight_group_ids_in_order(groups):
        return
    if _static_hero_group_ids_in_order(groups):
        return
    if _hero_creative_role_group_ids_in_order(groups):
        return
    raise ValueError(
        "post_lineup monthly pin requires a menu_highlight group, or at least one static_hero "
        "menu clusterer group, or a group with creativeRole hero"
    )


def normalize_monthly_pin_group_ids(
    group_ids: list[str],
    groups_by_id: dict[str, dict[str, Any]],
) -> list[str]:
    """Resolve monthly pin to the menu-highlight group when present, else static-hero merge."""
    del group_ids
    groups = list(groups_by_id.values())
    validate_monthly_pin_groups(groups)

    highlight_ids = _menu_highlight_group_ids_in_order(groups)
    if highlight_ids:
        return highlight_ids

    canonical = _static_hero_group_ids_in_order(groups)
    if not canonical:
        canonical = _hero_creative_role_group_ids_in_order(groups)

    if not canonical:
        raise ValueError("post_lineup monthly pin requires at least one static_hero or hero group")
    return canonical


def _slides_from_groups(
    selected_groups: list[dict[str, Any]],
    *,
    food_leads_by_name: dict[str, dict[str, Any]],
    max_slides: int | None = POST_LINEUP_MAX_SLIDES,
) -> list[dict[str, Any]]:
    slides: list[dict[str, Any]] = []
    seen_names: set[str] = set()

    for group in selected_groups:
        raw_items = group.get("items")
        if not isinstance(raw_items, list):
            continue
        for raw_item in raw_items:
            if max_slides is not None and len(slides) >= max_slides:
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
            slide.update(_slide_metrics_from_item(raw_item, lookup))
            slides.append(slide)

    return sort_items_by_popularity(slides)


def _resolve_groups(
    group_ids: list[str], groups_by_id: dict[str, dict[str, Any]]
) -> list[dict[str, Any]]:
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


def _weekday_lunch_schedule_hints(campaign_brief_data: dict[str, Any] | None) -> dict[str, Any]:
    return {
        "preferredWeekdays": preferred_weekdays_for_strategy(campaign_brief_data),
        "preferredTime": preferred_time_for_strategy(campaign_brief_data),
    }


def _build_post_from_plan(
    plan_post: dict[str, Any],
    *,
    groups_by_id: dict[str, dict[str, Any]],
    food_leads_by_name: dict[str, dict[str, Any]],
    post_id: str,
    campaign_brief_data: dict[str, Any] | None = None,
    campaign_week: CampaignWeek | None = None,
) -> dict[str, Any]:
    if not isinstance(plan_post, dict):
        raise ValueError("post_lineup plan post must be an object")
    intent_raw = str(plan_post.get("intent") or "").strip()
    if intent_raw not in ("pinned_monthly_menu", "weekday_lunch_post"):
        raise ValueError(f"post_lineup plan has invalid intent {intent_raw!r}")
    intent: Literal["pinned_monthly_menu", "weekday_lunch_post"] = intent_raw  # type: ignore[assignment]

    title = str(plan_post.get("title") or "").strip()
    if not title:
        raise ValueError(f"post_lineup plan for {intent} must include a non-empty title")

    description = str(plan_post.get("description") or "").strip()
    if not description:
        raise ValueError(f"post_lineup plan for {intent} must include a non-empty description")

    caption_guidance = str(plan_post.get("captionGuidance") or "").strip()
    if not caption_guidance:
        raise ValueError(f"post_lineup plan for {intent} must include non-empty captionGuidance")

    raw_group_ids = plan_post.get("groupIds")
    if not isinstance(raw_group_ids, list):
        raise ValueError(f"post_lineup plan for {intent} must include groupIds")
    group_ids = [str(value).strip() for value in raw_group_ids if str(value).strip()]
    if intent == "pinned_monthly_menu":
        group_ids = normalize_monthly_pin_group_ids(group_ids, groups_by_id)
    selected_groups = _resolve_groups(group_ids, groups_by_id)
    slide_cap: int | None = POST_LINEUP_MAX_SLIDES
    if intent == "pinned_monthly_menu":
        slide_cap = None
    slides = _slides_from_groups(
        selected_groups,
        food_leads_by_name=food_leads_by_name,
        max_slides=slide_cap,
    )
    if not slides:
        raise ValueError(f"post_lineup plan for {intent} produced no slides from selected groups")

    post: dict[str, Any] = {
        "id": post_id,
        "format": "carousel",
        "intent": intent,
        "title": title,
        "description": description,
        "captionGuidance": caption_guidance,
        "slides": slides,
        "groupIds": group_ids,
    }

    if intent == "weekday_lunch_post":
        if campaign_week is None:
            raise ValueError("weekday_lunch_post requires a campaign week for scheduling")
        post_date = str(campaign_week.post_date or "").strip()
        if not post_date:
            raise ValueError(
                f"weekday_lunch_post for week {campaign_week.week_index} is missing post_date"
            )
        post["date"] = post_date
        post["fixdate"] = True
        post["scheduleHints"] = _weekday_lunch_schedule_hints(campaign_brief_data)

    return post


def _weekly_plan_by_index(
    weekly_posts: list[dict[str, Any]],
    campaign_weeks: list[CampaignWeek],
) -> list[tuple[CampaignWeek, dict[str, Any]]]:
    if len(weekly_posts) != len(campaign_weeks):
        raise ValueError(
            f"post_lineup weeklyPosts length ({len(weekly_posts)}) must match "
            f"campaign weeks ({len(campaign_weeks)})"
        )

    by_index: dict[int, dict[str, Any]] = {}
    unmatched: list[dict[str, Any]] = []
    for plan in weekly_posts:
        raw_index = plan.get("weekIndex")
        if isinstance(raw_index, int) and raw_index > 0:
            if raw_index in by_index:
                raise ValueError(f"post_lineup weeklyPosts has duplicate weekIndex {raw_index}")
            by_index[raw_index] = plan
        else:
            unmatched.append(plan)

    paired: list[tuple[CampaignWeek, dict[str, Any]]] = []
    for week in campaign_weeks:
        week_plan: dict[str, Any] | None = by_index.get(week.week_index)
        if week_plan is None and unmatched:
            week_plan = unmatched.pop(0)
        if week_plan is None:
            raise ValueError(
                f"post_lineup weeklyPosts missing entry for weekIndex {week.week_index}"
            )
        intent = str(week_plan.get("intent") or "").strip()
        if intent != "weekday_lunch_post":
            raise ValueError(
                f"weeklyPosts entry for week {week.week_index} must be weekday_lunch_post"
            )
        paired.append((week, week_plan))

    if unmatched:
        raise ValueError("post_lineup weeklyPosts has entries that do not match campaign weeks")

    return paired


def build_post_lineup_from_plan(
    *,
    monthly_post: dict[str, Any],
    weekly_posts: list[dict[str, Any]],
    campaign_weeks: list[CampaignWeek],
    groups: list[dict[str, Any]],
    food_leads: list[dict[str, Any]],
    campaign_brief_data: dict[str, Any],
    start_date: str,
    end_date: str,
    source_menu_clusterer_title: str = "",
    source_campaign_brief_title: str = "",
    source_dates_title: str = "",
    notes: str = "",
) -> dict[str, Any]:
    if not groups:
        raise ValueError("post_lineup requires at least one menu clusterer group")
    if not campaign_weeks:
        raise ValueError("post_lineup requires at least one campaign week in the dates window")

    groups_by_id = _groups_by_id(groups)
    food_leads_by_name = _food_leads_by_name(food_leads)
    posts: list[dict[str, Any]] = []

    monthly_intent = str(monthly_post.get("intent") or "").strip()
    if monthly_intent != "pinned_monthly_menu":
        raise ValueError("monthlyPost intent must be pinned_monthly_menu")

    posts.append(
        _build_post_from_plan(
            monthly_post,
            groups_by_id=groups_by_id,
            food_leads_by_name=food_leads_by_name,
            post_id=POST_LINEUP_PINNED_POST_ID,
            campaign_brief_data=campaign_brief_data,
        )
    )

    for week, weekly_plan in _weekly_plan_by_index(weekly_posts, campaign_weeks):
        posts.append(
            _build_post_from_plan(
                weekly_plan,
                groups_by_id=groups_by_id,
                food_leads_by_name=food_leads_by_name,
                post_id=f"{POST_LINEUP_WEEKLY_POST_ID_PREFIX}-{week.week_start}",
                campaign_brief_data=campaign_brief_data,
                campaign_week=week,
            )
        )

    payload: dict[str, Any] = {
        "posts": posts,
        "startDate": start_date.strip(),
        "endDate": end_date.strip(),
    }
    source_clusterer_title = source_menu_clusterer_title.strip()
    if source_clusterer_title:
        payload["sourceMenuClustererTitle"] = source_clusterer_title
    source_brief_title = source_campaign_brief_title.strip()
    if source_brief_title:
        payload["sourceCampaignBriefTitle"] = source_brief_title
    source_dates = source_dates_title.strip()
    if source_dates:
        payload["sourceDatesTitle"] = source_dates
    owner_notes = notes.strip()
    if owner_notes:
        payload["notes"] = owner_notes
    return payload
