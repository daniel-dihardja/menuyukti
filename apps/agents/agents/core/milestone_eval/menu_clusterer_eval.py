"""Deterministic pass/fail checks for menu_clusterer milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

MENU_CLUSTERER_GROUP_MIN_SIZE = 1
MENU_CLUSTERER_GROUP_MAX_SIZE = 5
MENU_CLUSTERER_MIN_GROUP_COUNT = 4
MENU_CLUSTERER_DEFAULT_GROUP_COUNT = 4
MENU_CLUSTERER_MAX_GROUP_COUNT = 8
# Backward-compatible alias used in older call sites/tests.
MENU_CLUSTERER_MIN_GROUPS = MENU_CLUSTERER_MIN_GROUP_COUNT
MENU_CLUSTERER_TOP_LEADS = 5
MENU_CLUSTERER_CLUSTER_DESCRIPTION_MIN_LEN = 40


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_menu_clusterer_milestone_data(data: dict[str, Any]) -> bool:
    return isinstance(data.get("groups"), list)


def _target_group_count(data: dict[str, Any]) -> int:
    raw = data.get("targetGroupCount")
    if isinstance(raw, int) and raw >= MENU_CLUSTERER_MIN_GROUP_COUNT:
        return min(raw, MENU_CLUSTERER_MAX_GROUP_COUNT)
    return MENU_CLUSTERER_DEFAULT_GROUP_COUNT


def enrich_menu_clusterer_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_menu_clusterer_milestone_data(data):
        return data
    enriched = dict(data)
    target = _target_group_count(data)
    top_names = data.get("topFoodLeadNames")
    top_food_lead_names: list[str] = []
    if isinstance(top_names, list):
        top_food_lead_names = [str(name).strip() for name in top_names if str(name).strip()][
            :MENU_CLUSTERER_TOP_LEADS
        ]
    enriched["_evalHints"] = {
        "groupSizeRange": [MENU_CLUSTERER_GROUP_MIN_SIZE, MENU_CLUSTERER_GROUP_MAX_SIZE],
        "minFoodGroups": target,
        "targetGroupCount": target,
        "topFoodLeadNames": top_food_lead_names,
        "leadIsFirstItem": True,
        "clusterDescriptionMinLength": MENU_CLUSTERER_CLUSTER_DESCRIPTION_MIN_LEN,
    }
    return enriched


def _groups(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("groups")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _top_food_lead_names(data: dict[str, Any]) -> set[str]:
    raw = data.get("topFoodLeadNames")
    if isinstance(raw, list) and raw:
        return {str(name).strip().casefold() for name in raw if str(name).strip()}
    hints = data.get("_evalHints")
    if isinstance(hints, dict):
        hint_names = hints.get("topFoodLeadNames")
        if isinstance(hint_names, list):
            return {str(name).strip().casefold() for name in hint_names if str(name).strip()}
    return set()


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


def _groups_have_cluster_descriptions(groups: list[dict[str, Any]]) -> list[str]:
    issues: list[str] = []
    for group in groups:
        group_id = str(group.get("id") or "group")
        description = str(group.get("clusterDescription") or "").strip()
        if len(description) < MENU_CLUSTERER_CLUSTER_DESCRIPTION_MIN_LEN:
            issues.append(f"{group_id} is missing a sufficient clusterDescription")
    return issues


def _validate_food_groups(
    groups: list[dict[str, Any]],
    *,
    top5_names: set[str],
    empty_message: str,
) -> list[str]:
    issues: list[str] = []
    for group in groups:
        group_id = str(group.get("id") or "group")
        items = group.get("items")
        if not isinstance(items, list) or not items:
            issues.append(f"{group_id} has no items")
            continue
        if not (MENU_CLUSTERER_GROUP_MIN_SIZE <= len(items) <= MENU_CLUSTERER_GROUP_MAX_SIZE):
            issues.append(
                f"{group_id} must contain between {MENU_CLUSTERER_GROUP_MIN_SIZE} and "
                f"{MENU_CLUSTERER_GROUP_MAX_SIZE} items"
            )
            continue
        first = items[0] if isinstance(items[0], dict) else {}
        if int(first.get("position") or 0) != 1:
            issues.append(f"{group_id} lead is not at position 1")
            continue
        first_name = str(first.get("name") or "").strip()
        if top5_names and first_name.casefold() not in top5_names:
            issues.append(f"{group_id} lead {first_name!r} is not in topFoodLeadNames")
            continue
        lead_name = str(group.get("leadName") or "").strip()
        if lead_name and first_name and lead_name.casefold() != first_name.casefold():
            issues.append(f"{group_id} leadName does not match position-1 item")
    if not groups and empty_message:
        issues.append(empty_message)
    return issues


def try_menu_clusterer_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_menu_clusterer_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    groups = _groups(data)
    top5_names = _top_food_lead_names(data)

    if "menu_tagger" in norm and ("prior" in norm or "earlier" in norm or "run used" in norm):
        if not groups:
            return ("fail", "menu clusterer data has no groups from prior menu_tagger items.")
        return ("pass", f"menu clusterer produced {len(groups)} food cluster(s) from tagged items.")

    if "campaign" in norm and "brief" in norm:
        source_title = str(data.get("sourceCampaignBriefTitle") or "").strip()
        if source_title and _groups_have_schedule_hints(groups):
            return (
                "pass",
                "menu clusterer references campaign brief strategy and includes food-group scheduling hints.",
            )
        return (
            "fail",
            "menu clusterer is missing sourceCampaignBriefTitle or campaign-aware food-group scheduling hints.",
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
        ("at least" in norm or "least" in norm or "minimum" in norm)
        and ("group" in norm or "cluster" in norm or "reel" in norm)
        and "drink" not in norm
        and "beverage" not in norm
    ):
        min_groups = _target_group_count(data)
        if len(groups) < min_groups:
            return (
                "fail",
                f"menu clusterer has {len(groups)} food groups; minimum is {min_groups}.",
            )
        return (
            "pass",
            f"menu clusterer produced {len(groups)} food cluster(s) (at least {min_groups}).",
        )

    if (
        ("up to" in norm or "at most" in norm)
        and "5" in norm
        and ("group" in norm or "hook" in norm or "reel" in norm)
        and "drink" not in norm
        and "beverage" not in norm
    ):
        if not groups:
            return ("fail", "no menu clusterer food clusters to validate.")
        return (
            "pass",
            f"menu clusterer produced {len(groups)} food cluster(s).",
        )

    if "clusterdescription" in norm.replace(" ", "") or (
        "cluster" in norm and "description" in norm
    ):
        issues = _groups_have_cluster_descriptions(groups)
        if issues:
            return ("fail", "; ".join(issues[:4]))
        if not groups:
            return ("fail", "no menu clusterer food clusters to validate.")
        return (
            "pass",
            "each food cluster includes a clusterDescription explaining grouping and venue fit.",
        )

    if (
        "top" in norm
        and "5" in norm
        and ("position" in norm or "lead" in norm or "hook" in norm or "popularity" in norm)
    ):
        issues = _validate_food_groups(
            groups,
            top5_names=top5_names,
            empty_message="no menu clusterer food clusters to validate.",
        )
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return (
            "pass",
            "each food cluster position-1 item is a top-5 food lead by popularity ranking.",
        )

    if (
        "main" in norm
        and "storytelling" in norm
        and ("position" in norm or "lead" in norm or "hook" in norm)
    ):
        issues = _validate_food_groups(
            groups,
            top5_names=top5_names,
            empty_message="no menu clusterer food clusters to validate.",
        )
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return (
            "pass",
            "each food cluster has a valid position-1 lead from the top-5 food lead pool.",
        )

    return None
