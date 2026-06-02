"""Build Instagram Reel concepts from LLM plans and menu clusterer data."""

from __future__ import annotations

from typing import Any, Literal

from agents_app.agents.core.milestone_run.dates_window import (
    CampaignWeek,
    preferred_weekdays_for_strategy,
    schedule_hints_for_reel_intent,
)

REEL_LINEUP_WEEKDAY_REEL_ID_PREFIX = "weekday-reel-week-"
REEL_LINEUP_WEEKEND_REEL_ID_PREFIX = "weekend-reel-week-"


def _creative_role(group: dict[str, Any]) -> str:
    return str(group.get("creativeRole") or "").strip().lower()


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


def validate_static_hero_groups(groups: list[dict[str, Any]]) -> None:
    """Fail fast when menu clusterer output cannot satisfy reel hero assignment."""
    if _static_hero_group_ids_in_order(groups):
        return
    if _hero_creative_role_group_ids_in_order(groups):
        return
    raise ValueError(
        "reel_lineup requires at least one static_hero menu clusterer group "
        "or a group with creativeRole hero"
    )


def _groups_by_id(groups: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_id: dict[str, dict[str, Any]] = {}
    for group in groups:
        if not isinstance(group, dict):
            continue
        group_id = str(group.get("id") or "").strip()
        if group_id:
            by_id[group_id] = group
    return by_id


def _hero_dishes_from_group(group: dict[str, Any]) -> list[dict[str, Any]]:
    dishes: list[dict[str, Any]] = []
    raw_items = group.get("items")
    if not isinstance(raw_items, list):
        return dishes
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        dish: dict[str, Any] = {"name": name}
        reel_moment = str(item.get("reelMoment") or "").strip()
        if reel_moment:
            dish["reelMoment"] = reel_moment
        role = str(item.get("role") or "").strip()
        if role in ("star", "puzzle"):
            dish["role"] = role
        dishes.append(dish)
    return dishes


def coerce_campaign_weeks(raw_weeks: list[Any]) -> list[CampaignWeek]:
    """Normalize LangGraph state weeks (dataclass or serialized dict) for build."""
    weeks: list[CampaignWeek] = []
    for raw in raw_weeks:
        if isinstance(raw, CampaignWeek):
            weeks.append(raw)
            continue
        if isinstance(raw, dict):
            weeks.append(
                CampaignWeek(
                    week_index=int(raw.get("weekIndex") or 0),
                    week_start=str(raw.get("weekStart") or "").strip(),
                    week_end=str(raw.get("weekEnd") or "").strip(),
                    post_date=str(raw.get("postDate") or "").strip(),
                )
            )
            continue
        raise ValueError("reel_lineup campaign_weeks entries must be CampaignWeek or dict")
    return weeks


def reel_week_plan(
    campaign_weeks: list[CampaignWeek],
    *,
    campaign_brief_data: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    preferred_weekdays = preferred_weekdays_for_strategy(campaign_brief_data)
    return [
        {
            "weekIndex": week.week_index,
            "weekStart": week.week_start,
            "weekEnd": week.week_end,
            "preferredWeekdays": preferred_weekdays,
        }
        for week in campaign_weeks
    ]


def _weekly_plan_by_index(
    weekly_reels: list[dict[str, Any]],
    campaign_weeks: list[CampaignWeek],
) -> list[tuple[CampaignWeek, dict[str, Any]]]:
    if len(weekly_reels) != len(campaign_weeks):
        raise ValueError(
            f"reel_lineup weeklyReels length ({len(weekly_reels)}) must match "
            f"campaign weeks ({len(campaign_weeks)})"
        )

    by_index: dict[int, dict[str, Any]] = {}
    unmatched: list[dict[str, Any]] = []
    for plan in weekly_reels:
        raw_index = plan.get("weekIndex")
        if isinstance(raw_index, int) and raw_index > 0:
            if raw_index in by_index:
                raise ValueError(f"reel_lineup weeklyReels has duplicate weekIndex {raw_index}")
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
                f"reel_lineup weeklyReels missing entry for weekIndex {week.week_index}"
            )
        paired.append((week, week_plan))

    if unmatched:
        raise ValueError("reel_lineup weeklyReels has entries that do not match campaign weeks")

    return paired


def _group_id_from_slot(
    slot: dict[str, Any],
    *,
    intent: Literal["weekday_reel", "weekend_reel"],
    valid_group_ids: set[str],
) -> str:
    if not isinstance(slot, dict):
        raise ValueError(f"reel_lineup plan must include {intent} object")
    group_id = str(slot.get("groupId") or "").strip()
    if not group_id:
        raise ValueError(f"reel_lineup {intent} must include groupId from Menu clusterer groups")
    if group_id not in valid_group_ids:
        raise ValueError(f"reel_lineup {intent} references unknown group id {group_id!r}")
    return group_id


def _reel_copy_from_plan(
    slot: dict[str, Any],
    *,
    intent: Literal["weekday_reel", "weekend_reel"],
) -> tuple[str, str, str]:
    if not isinstance(slot, dict):
        raise ValueError(f"reel_lineup plan must include {intent} object")
    title = str(slot.get("title") or "").strip()
    if not title:
        raise ValueError(f"reel_lineup {intent} must include a non-empty title")
    description = str(slot.get("description") or "").strip()
    if not description:
        raise ValueError(f"reel_lineup {intent} must include a non-empty description")
    explanation = str(slot.get("explanation") or "").strip()
    if not explanation:
        raise ValueError(f"reel_lineup {intent} must include a non-empty explanation")
    return title, description, explanation


def _build_reel(
    *,
    intent: Literal["weekday_reel", "weekend_reel"],
    post_id: str,
    slot: dict[str, Any],
    group_id: str,
    groups_by_id: dict[str, dict[str, Any]],
    week_index: int,
    campaign_brief_data: dict[str, Any] | None,
) -> dict[str, Any]:
    title, description, explanation = _reel_copy_from_plan(slot, intent=intent)
    group = groups_by_id.get(group_id)
    if group is None:
        raise ValueError(f"reel_lineup references unknown group id {group_id!r}")

    reel: dict[str, Any] = {
        "id": post_id,
        "format": "reel",
        "intent": intent,
        "title": title,
        "description": description,
        "explanation": explanation,
        "groupIds": [group_id],
        "weekIndex": week_index,
        "heroDishes": _hero_dishes_from_group(group),
        "scheduleHints": schedule_hints_for_reel_intent(intent, campaign_brief_data),
    }
    return reel


def build_reel_lineup_from_plan(
    *,
    weekly_reels: list[dict[str, Any]],
    campaign_weeks: list[CampaignWeek],
    groups: list[dict[str, Any]],
    campaign_brief_data: dict[str, Any],
    start_date: str,
    end_date: str,
    source_menu_clusterer_title: str = "",
    source_campaign_brief_title: str = "",
    source_dates_title: str = "",
    notes: str = "",
) -> dict[str, Any]:
    if not groups:
        raise ValueError("reel_lineup requires at least one menu clusterer group")
    if not campaign_weeks:
        raise ValueError("reel_lineup requires at least one campaign week in the dates window")

    campaign_weeks = coerce_campaign_weeks(list(campaign_weeks))
    groups_by_id = _groups_by_id(groups)
    valid_group_ids = set(groups_by_id.keys())

    reels: list[dict[str, Any]] = []
    for week, weekly_plan in _weekly_plan_by_index(weekly_reels, campaign_weeks):
        weekday_slot = weekly_plan.get("weekdayReel")
        weekend_slot = weekly_plan.get("weekendReel")
        if not isinstance(weekday_slot, dict):
            raise ValueError(f"reel_lineup week {week.week_index} missing weekdayReel")
        if not isinstance(weekend_slot, dict):
            raise ValueError(f"reel_lineup week {week.week_index} missing weekendReel")

        weekday_group_id = _group_id_from_slot(
            weekday_slot,
            intent="weekday_reel",
            valid_group_ids=valid_group_ids,
        )
        weekend_group_id = _group_id_from_slot(
            weekend_slot,
            intent="weekend_reel",
            valid_group_ids=valid_group_ids,
        )
        reels.append(
            _build_reel(
                intent="weekday_reel",
                post_id=f"{REEL_LINEUP_WEEKDAY_REEL_ID_PREFIX}{week.week_start}",
                slot=weekday_slot,
                group_id=weekday_group_id,
                groups_by_id=groups_by_id,
                week_index=week.week_index,
                campaign_brief_data=campaign_brief_data,
            )
        )
        reels.append(
            _build_reel(
                intent="weekend_reel",
                post_id=f"{REEL_LINEUP_WEEKEND_REEL_ID_PREFIX}{week.week_start}",
                slot=weekend_slot,
                group_id=weekend_group_id,
                groups_by_id=groups_by_id,
                week_index=week.week_index,
                campaign_brief_data=campaign_brief_data,
            )
        )

    payload: dict[str, Any] = {
        "reels": reels,
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
