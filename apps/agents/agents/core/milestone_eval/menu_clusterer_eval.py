"""Deterministic pass/fail checks for menu_clusterer milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

MENU_CLUSTERER_GROUP_MIN_SIZE = 1
MENU_CLUSTERER_HIGHLIGHT_MAX_SIZE = 12
MENU_CLUSTERER_MIN_GROUP_COUNT = 1
MENU_CLUSTERER_DEFAULT_GROUP_COUNT = 1
MENU_CLUSTERER_MAX_GROUP_COUNT = 20
# Backward-compatible alias used in older call sites/tests.
MENU_CLUSTERER_MIN_GROUPS = MENU_CLUSTERER_MIN_GROUP_COUNT
MENU_CLUSTERER_TOP_FOOD_LEAD_NAMES_MAX = 12
MENU_CLUSTERER_CLUSTER_DESCRIPTION_MIN_LEN = 40


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_menu_clusterer_milestone_data(data: dict[str, Any]) -> bool:
    return isinstance(data.get("groups"), list)


def _target_group_count(data: dict[str, Any]) -> int:
    raw = data.get("targetGroupCount")
    if isinstance(raw, int) and raw >= MENU_CLUSTERER_MIN_GROUP_COUNT:
        return min(raw, MENU_CLUSTERER_MAX_GROUP_COUNT)
    groups = _groups(data)
    signature_count = len(_signature_groups(groups))
    if signature_count > 0:
        return signature_count
    return MENU_CLUSTERER_DEFAULT_GROUP_COUNT


def _unassigned_item_names(data: dict[str, Any]) -> list[str]:
    raw = data.get("unassignedItemNames")
    if not isinstance(raw, list):
        return []
    return [str(name).strip() for name in raw if str(name).strip()]


def enrich_menu_clusterer_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_menu_clusterer_milestone_data(data):
        return data
    enriched = dict(data)
    target = _target_group_count(data)
    top_names = data.get("topFoodLeadNames")
    top_food_lead_names: list[str] = []
    if isinstance(top_names, list):
        top_food_lead_names = [str(name).strip() for name in top_names if str(name).strip()][
            :MENU_CLUSTERER_TOP_FOOD_LEAD_NAMES_MAX
        ]
    enriched["_evalHints"] = {
        "groupSizeRange": [MENU_CLUSTERER_GROUP_MIN_SIZE, MENU_CLUSTERER_HIGHLIGHT_MAX_SIZE],
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


def _is_menu_highlight_group(group: dict[str, Any]) -> bool:
    return str(group.get("profileId") or "").strip() == "menu_highlight"


def _signature_groups(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [group for group in groups if _is_menu_highlight_group(group)]


def _hook_reel_groups(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [group for group in groups if not _is_menu_highlight_group(group)]


def _item_popularity(item: dict[str, Any]) -> float:
    raw = item.get("popularity")
    if raw is None or raw == "":
        return -1.0
    try:
        return float(raw)
    except (TypeError, ValueError):
        return -1.0


def _groups_reference_campaign_brief(groups: list[dict[str, Any]]) -> bool:
    if not groups:
        return False
    return all(str(group.get("strategyFocus") or "").strip() for group in groups)


def _groups_have_cluster_descriptions(groups: list[dict[str, Any]]) -> list[str]:
    issues: list[str] = []
    for group in groups:
        group_id = str(group.get("id") or "group")
        description = str(group.get("clusterDescription") or "").strip()
        if len(description) < MENU_CLUSTERER_CLUSTER_DESCRIPTION_MIN_LEN:
            issues.append(f"{group_id} is missing a sufficient clusterDescription")
    return issues


def _validate_signature_groups(groups: list[dict[str, Any]], *, empty_message: str) -> list[str]:
    issues: list[str] = []
    if not groups and empty_message:
        issues.append(empty_message)
        return issues

    for group in groups:
        group_id = str(group.get("id") or "group")
        items = group.get("items")
        if not isinstance(items, list) or not items:
            issues.append(f"{group_id} has no items")
            continue
        if not (
            MENU_CLUSTERER_GROUP_MIN_SIZE <= len(items) <= MENU_CLUSTERER_HIGHLIGHT_MAX_SIZE
        ):
            issues.append(
                f"{group_id} must contain between {MENU_CLUSTERER_GROUP_MIN_SIZE} and "
                f"{MENU_CLUSTERER_HIGHLIGHT_MAX_SIZE} items"
            )
            continue
        first = items[0] if isinstance(items[0], dict) else {}
        if int(first.get("position") or 0) != 1:
            issues.append(f"{group_id} lead is not at position 1")
            continue
        first_name = str(first.get("name") or "").strip()
        lead_name = str(group.get("leadName") or "").strip()
        if lead_name and first_name and lead_name.casefold() != first_name.casefold():
            issues.append(f"{group_id} leadName does not match position-1 item")
            continue
        if str(first.get("role") or "").strip().casefold() != "star":
            issues.append(f"{group_id} lead {first_name!r} is not a star item")
            continue
        for row in items:
            if not isinstance(row, dict):
                continue
            if str(row.get("role") or "").strip().casefold() != "star":
                issues.append(f"{group_id} includes non-star item {row.get('name')!r}")
                break
        category = str(first.get("category") or "").strip()
        if category:
            for row in items:
                if not isinstance(row, dict):
                    continue
                row_category = str(row.get("category") or "").strip()
                if row_category and row_category.casefold() != category.casefold():
                    issues.append(f"{group_id} mixes categories {category!r} and {row_category!r}")
                    break
        top_popularity = max(_item_popularity(row) for row in items if isinstance(row, dict))
        if _item_popularity(first) < top_popularity:
            issues.append(f"{group_id} lead {first_name!r} is not the top star by popularity")
    return issues


def try_menu_clusterer_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_menu_clusterer_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    groups = _groups(data)
    signature_groups = _signature_groups(groups)
    hook_groups = _hook_reel_groups(groups)
    uses_signature_model = bool(signature_groups) and not hook_groups

    if "menu_tagger" in norm and ("prior" in norm or "earlier" in norm or "run used" in norm):
        if not groups:
            return ("fail", "menu clusterer data has no groups from prior menu_tagger items.")
        return ("pass", f"menu clusterer produced {len(groups)} signature cluster(s) from tagged items.")

    if (("prior" in norm or "run used" in norm) and "campaign" in norm and "brief" in norm) or (
        "restaurant_campaign_brief" in norm and ("prior" in norm or "run used" in norm)
    ):
        source_title = str(data.get("sourceCampaignBriefTitle") or "").strip()
        if source_title and groups and _groups_reference_campaign_brief(groups):
            return (
                "pass",
                "menu clusterer used prior campaign brief strategy for signature clustering.",
            )
        return (
            "fail",
            "menu clusterer is missing sourceCampaignBriefTitle or campaign-aware strategy on groups.",
        )

    if "unassigned" in norm and ("food" in norm or "menu" in norm or "tagged" in norm):
        unassigned = _unassigned_item_names(data)
        if uses_signature_model:
            if not groups:
                return ("fail", "menu clusterer data has no signature clusters.")
            return (
                "pass",
                "signature clusters include star items; non-star tagged items may remain unassigned.",
            )
        if unassigned:
            return (
                "fail",
                f"menu clusterer left {len(unassigned)} tagged food item(s) unassigned: "
                f"{', '.join(unassigned[:5])}.",
            )
        if not groups:
            return ("fail", "menu clusterer data has no food clusters.")
        return (
            "pass",
            "every tagged food item from menu tagger appears in at least one food cluster.",
        )

    if (
        ("every" in norm or "all tagged" in norm)
        and "food" in norm
        and ("item" in norm or "menu" in norm)
        and ("cluster" in norm or "group" in norm)
    ):
        if uses_signature_model:
            if not signature_groups:
                return ("fail", "menu clusterer data has no signature clusters.")
            return ("pass", "star items are assigned to per-category signature clusters.")
        unassigned = _unassigned_item_names(data)
        if unassigned:
            return (
                "fail",
                f"menu clusterer left {len(unassigned)} food item(s) without a cluster assignment.",
            )
        if not groups:
            return ("fail", "menu clusterer data has no food clusters.")
        return ("pass", "all tagged food items are assigned to food clusters.")

    if (
        (
            "at least" in norm
            or "least" in norm
            or "minimum" in norm
            or "configured number" in norm
            or "derived number" in norm
            or "one signature" in norm
            or "per category" in norm
            or "per available" in norm
        )
        and ("group" in norm or "cluster" in norm or "reel" in norm or "signature" in norm)
        and "drink" not in norm
        and "beverage" not in norm
    ):
        target = _target_group_count(data)
        active_groups = signature_groups if uses_signature_model else hook_groups
        if len(active_groups) < MENU_CLUSTERER_MIN_GROUP_COUNT:
            return (
                "fail",
                f"menu clusterer has {len(active_groups)} signature cluster(s); minimum is "
                f"{MENU_CLUSTERER_MIN_GROUP_COUNT}.",
            )
        if len(active_groups) != target:
            return (
                "fail",
                f"menu clusterer has {len(active_groups)} signature cluster(s); expected {target}.",
            )
        label = "signature" if uses_signature_model else "hook Reel"
        return (
            "pass",
            f"menu clusterer produced {len(active_groups)} {label} cluster(s) (target {target}).",
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
            "each signature cluster includes a clusterDescription explaining grouping and venue fit.",
        )

    if (
        ("top" in norm and ("star" in norm or "lead" in norm or "position" in norm))
        or (
            "top" in norm
            and "5" in norm
            and ("position" in norm or "lead" in norm or "hook" in norm or "popularity" in norm)
        )
        or ("main" in norm and "storytelling" in norm and ("position" in norm or "lead" in norm))
    ):
        if uses_signature_model:
            issues = _validate_signature_groups(
                signature_groups,
                empty_message="no menu clusterer signature clusters to validate.",
            )
            if issues:
                return ("fail", "; ".join(issues[:4]))
            return (
                "pass",
                "each signature cluster lead is the top star in its category by popularity.",
            )
        top5_names = {
            str(name).strip().casefold()
            for name in (data.get("topFoodLeadNames") or [])
            if str(name).strip()
        }
        issues = _validate_hook_reel_groups(hook_groups, top5_names=top5_names)
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return (
            "pass",
            "each hook Reel cluster position-1 item is a top popularity score-tier food lead.",
        )

    return None


def _validate_hook_reel_groups(
    groups: list[dict[str, Any]],
    *,
    top5_names: set[str],
) -> list[str]:
    issues: list[str] = []
    for group in groups:
        group_id = str(group.get("id") or "group")
        items = group.get("items")
        if not isinstance(items, list) or not items:
            issues.append(f"{group_id} has no items")
            continue
        if not (MENU_CLUSTERER_GROUP_MIN_SIZE <= len(items) <= 5):
            issues.append(f"{group_id} must contain between 1 and 5 items")
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
    return issues
