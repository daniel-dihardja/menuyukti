"""Deterministic pass/fail checks for reel_lineup milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

REEL_LINEUP_GROUP_MIN_SIZE = 1
REEL_LINEUP_GROUP_MAX_SIZE = 5
REEL_LINEUP_MAX_LEADS = 5
REEL_LINEUP_MAX_DRINK_LEADS = 3


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_reel_lineup_milestone_data(data: dict[str, Any]) -> bool:
    return isinstance(data.get("groups"), list)


def enrich_reel_lineup_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_reel_lineup_milestone_data(data):
        return data
    enriched = dict(data)
    enriched["_evalHints"] = {
        "groupSizeRange": [REEL_LINEUP_GROUP_MIN_SIZE, REEL_LINEUP_GROUP_MAX_SIZE],
        "maxLeadGroups": REEL_LINEUP_MAX_LEADS,
        "maxDrinkLeadGroups": REEL_LINEUP_MAX_DRINK_LEADS,
        "leadIsFirstItem": True,
    }
    return enriched


def _groups(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("groups")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _drink_groups(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("drinkGroups")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _groups_have_schedule_hints(groups: list[dict[str, Any]]) -> bool:
    if not groups:
        return False
    for group in groups:
        hints = group.get("scheduleHints")
        if not isinstance(hints, dict):
            return False
        weekdays = hints.get("preferredWeekdays")
        preferred_time = str(hints.get("preferredTime") or "").strip()
        if not isinstance(weekdays, list) or not weekdays or not preferred_time:
            return False
        if not str(group.get("strategyFocus") or "").strip():
            return False
    return True


def _is_main_course_strong_story_lead(item: dict[str, Any]) -> bool:
    storytelling = str(item.get("storytellingFit") or "").strip().lower()
    if storytelling != "strong":
        return False
    reel_moment = str(item.get("reelMoment") or "").strip()
    return bool(reel_moment)


def _is_drink_hook_lead(item: dict[str, Any]) -> bool:
    reel_moment = str(item.get("reelMoment") or "").strip()
    return bool(reel_moment)


def _validate_hook_groups(
    groups: list[dict[str, Any]],
    *,
    validate_lead: Any,
    empty_message: str,
    lead_issue_suffix: str,
) -> list[str]:
    issues: list[str] = []
    for group in groups:
        items = group.get("items")
        if not isinstance(items, list) or not items:
            issues.append(f"{group.get('id') or 'group'} has no items")
            continue
        if len(items) != 1:
            issues.append(f"{group.get('id') or 'group'} must currently have one hook item")
            continue
        first = items[0] if isinstance(items[0], dict) else {}
        if int(first.get("position") or 0) != 1:
            issues.append(f"{group.get('id') or 'group'} hook is not at position 1")
            continue
        if not validate_lead(first):
            issues.append(f"{group.get('id') or 'group'} {lead_issue_suffix}")
            continue
        lead_name = str(group.get("leadName") or "").strip()
        first_name = str(first.get("name") or "").strip()
        if lead_name and first_name and lead_name.casefold() != first_name.casefold():
            issues.append(f"{group.get('id') or 'group'} leadName does not match hook item")
    if not groups and empty_message:
        issues.append(empty_message)
    return issues


def try_reel_lineup_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_reel_lineup_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    groups = _groups(data)
    drink_groups = _drink_groups(data)

    if "menu_tagger" in norm and ("prior" in norm or "earlier" in norm or "run used" in norm):
        if not groups and not drink_groups:
            return ("fail", "reel lineup data has no groups from prior menu_tagger items.")
        total = len(groups) + len(drink_groups)
        return ("pass", f"reel lineup produced {total} group(s) from tagged items.")

    if "campaign" in norm and "brief" in norm:
        source_title = str(data.get("sourceCampaignBriefTitle") or "").strip()
        if source_title and _groups_have_schedule_hints(groups):
            return (
                "pass",
                "reel lineup references campaign brief strategy and includes food-group scheduling hints.",
            )
        return (
            "fail",
            "reel lineup is missing sourceCampaignBriefTitle or campaign-aware food-group scheduling hints.",
        )

    if "schedule" in norm or "cadence" in norm or "weekday" in norm:
        if _groups_have_schedule_hints(groups):
            return (
                "pass",
                "each food reel group includes strategy focus plus preferred weekdays/time scheduling hints.",
            )
        return (
            "fail",
            "one or more food reel groups is missing strategy focus or preferred weekday/time hints.",
        )

    if (
        ("up to" in norm or "at most" in norm)
        and "5" in norm
        and ("group" in norm or "hook" in norm or "reel" in norm)
        and "drink" not in norm
        and "beverage" not in norm
    ):
        if len(groups) > REEL_LINEUP_MAX_LEADS:
            return (
                "fail",
                f"reel lineup has {len(groups)} food groups; maximum is {REEL_LINEUP_MAX_LEADS}.",
            )
        if not groups:
            return ("fail", "no reel lineup food hook groups to validate.")
        return (
            "pass",
            f"reel lineup produced {len(groups)} food hook group(s) (at most {REEL_LINEUP_MAX_LEADS}).",
        )

    if (
        ("up to" in norm or "at most" in norm)
        and "3" in norm
        and ("drink" in norm or "beverage" in norm)
    ):
        if len(drink_groups) > REEL_LINEUP_MAX_DRINK_LEADS:
            return (
                "fail",
                f"reel lineup has {len(drink_groups)} drink groups; maximum is {REEL_LINEUP_MAX_DRINK_LEADS}.",
            )
        return (
            "pass",
            f"reel lineup produced {len(drink_groups)} drink hook group(s) (at most {REEL_LINEUP_MAX_DRINK_LEADS}).",
        )

    if (
        "main" in norm
        and "storytelling" in norm
        and ("position" in norm or "lead" in norm or "hook" in norm)
    ):
        issues = _validate_hook_groups(
            groups,
            validate_lead=_is_main_course_strong_story_lead,
            empty_message="no reel lineup food hook groups to validate.",
            lead_issue_suffix="hook lacks strong storytelling",
        )
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return (
            "pass",
            "each food hook group lead is a main-course item with strong storytelling at position 1.",
        )

    if ("drink" in norm or "beverage" in norm) and (
        "position" in norm or "hook" in norm or "group" in norm
    ):
        issues = _validate_hook_groups(
            drink_groups,
            validate_lead=_is_drink_hook_lead,
            empty_message="",
            lead_issue_suffix="drink hook lacks reel moment",
        )
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return (
            "pass",
            "each drink hook group has a position-1 beverage lead with a reel moment (storytelling fit not required).",
        )

    return None
