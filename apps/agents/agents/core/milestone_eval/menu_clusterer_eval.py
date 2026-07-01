"""Deterministic pass/fail checks for menu_clusterer milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

from agents_app.agents.core.milestone_run.menu_clusterer.cluster import (
    hook_category_scope_issues,
    is_mixed_category_group,
    is_same_category_group,
)

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

MENU_CLUSTERER_GROUP_MIN_SIZE = 1
MENU_CLUSTERER_GROUP_MAX_SIZE = 5
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
    hook_count = len(_hook_reel_groups(_groups(data)))
    if hook_count > 0:
        return hook_count
    top_five_count = len(_top_five_groups(_groups(data)))
    if top_five_count > 0:
        return top_five_count
    return MENU_CLUSTERER_DEFAULT_GROUP_COUNT


def _top_five_group_count(data: dict[str, Any]) -> int:
    raw = data.get("topFiveGroupCount")
    if isinstance(raw, int) and raw >= MENU_CLUSTERER_MIN_GROUP_COUNT:
        return min(raw, MENU_CLUSTERER_MAX_GROUP_COUNT)
    return len(_top_five_groups(_groups(data)))


def _unassigned_item_names(data: dict[str, Any]) -> list[str]:
    raw = data.get("unassignedItemNames")
    if not isinstance(raw, list):
        return []
    return [str(name).strip() for name in raw if str(name).strip()]


def enrich_menu_clusterer_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_menu_clusterer_milestone_data(data):
        return data
    enriched = dict(data)
    hook_target = _target_group_count(data)
    top_five_target = _top_five_group_count(data)
    top_names = data.get("topFoodLeadNames")
    top_food_lead_names: list[str] = []
    if isinstance(top_names, list):
        top_food_lead_names = [str(name).strip() for name in top_names if str(name).strip()][
            :MENU_CLUSTERER_TOP_FOOD_LEAD_NAMES_MAX
        ]
    enriched["_evalHints"] = {
        "groupSizeRange": [MENU_CLUSTERER_GROUP_MIN_SIZE, MENU_CLUSTERER_HIGHLIGHT_MAX_SIZE],
        "minFoodGroups": hook_target,
        "targetGroupCount": hook_target,
        "topFiveGroupCount": top_five_target,
        "topFiveGroupIds": [
            str(group.get("id") or "") for group in _top_five_groups(_groups(data))
        ],
        "hookReelGroupIds": [
            str(group.get("id") or "") for group in _hook_reel_groups(_groups(data))
        ],
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


def _is_top_five_group(group: dict[str, Any]) -> bool:
    return str(group.get("profileId") or "").strip() == "top_five"


def _top_five_groups(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [group for group in groups if _is_top_five_group(group)]


def _hook_reel_groups(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [group for group in groups if str(group.get("profileId") or "").strip() == "hook_reel"]


def _hook_category_scope_issues(hook_groups: list[dict[str, Any]]) -> list[str]:
    return hook_category_scope_issues(hook_groups)


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


def _validate_top_five_groups(groups: list[dict[str, Any]], *, empty_message: str) -> list[str]:
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
        category = str(group.get("category") or first.get("category") or "").strip()
        if not category:
            issues.append(f"{group_id} is missing category")
            continue
        for row in items:
            if not isinstance(row, dict):
                continue
            row_category = str(row.get("category") or "").strip()
            if row_category and row_category.casefold() != category.casefold():
                issues.append(f"{group_id} mixes categories {category!r} and {row_category!r}")
                break
        top_popularity = max(_item_popularity(row) for row in items if isinstance(row, dict))
        if _item_popularity(first) < top_popularity:
            issues.append(
                f"{group_id} (top_five) lead {first_name!r} is not the top star by popularity"
            )
    return issues


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
        if not (MENU_CLUSTERER_GROUP_MIN_SIZE <= len(items) <= MENU_CLUSTERER_GROUP_MAX_SIZE):
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


def try_menu_clusterer_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_menu_clusterer_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    groups = _groups(data)
    top_five_groups = _top_five_groups(groups)
    hook_groups = _hook_reel_groups(groups)
    is_hybrid = bool(top_five_groups) and bool(hook_groups)
    uses_top_five_only = bool(top_five_groups) and not hook_groups

    if "menu_tagger" in norm and ("prior" in norm or "earlier" in norm or "run used" in norm):
        if not groups:
            return ("fail", "menu clusterer data has no groups from prior menu_tagger items.")
        label = "cluster" if is_hybrid else "top five group"
        return ("pass", f"menu clusterer produced {len(groups)} {label}(s) from tagged items.")

    if (("prior" in norm or "run used" in norm) and "campaign" in norm and "brief" in norm) or (
        "restaurant_campaign_brief" in norm and ("prior" in norm or "run used" in norm)
    ):
        source_title = str(data.get("sourceCampaignBriefTitle") or "").strip()
        if source_title and groups and _groups_reference_campaign_brief(groups):
            return (
                "pass",
                "menu clusterer used prior campaign brief strategy for clustering.",
            )
        return (
            "fail",
            "menu clusterer is missing sourceCampaignBriefTitle or campaign-aware strategy on groups.",
        )

    if "unassigned" in norm and ("food" in norm or "menu" in norm or "tagged" in norm):
        unassigned = _unassigned_item_names(data)
        if uses_top_five_only:
            if not groups:
                return ("fail", "menu clusterer data has no top five groups.")
            return (
                "pass",
                "top five groups include star items; non-star tagged items may remain unassigned.",
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
        if uses_top_five_only:
            if not top_five_groups:
                return ("fail", "menu clusterer data has no top five groups.")
            return ("pass", "star items are assigned to per-category top five groups.")
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
            or "one top" in norm
            or "one signature" in norm
            or "per category" in norm
            or "per available" in norm
        )
        and (
            "group" in norm
            or "cluster" in norm
            or "reel" in norm
            or "signature" in norm
            or "top five" in norm
        )
        and "drink" not in norm
        and "beverage" not in norm
    ):
        wants_hook = "hook" in norm or "reel" in norm or "derived number" in norm
        wants_top_five = (
            "top five" in norm
            or "top_five" in norm
            or "signature" in norm
            or "per category" in norm
            or "per available" in norm
        )
        if is_hybrid and wants_hook and wants_top_five:
            hook_target = _target_group_count(data)
            top_five_target = _top_five_group_count(data)
            issues: list[str] = []
            if len(hook_groups) != hook_target:
                issues.append(
                    f"expected {hook_target} hook Reel cluster(s), got {len(hook_groups)}"
                )
            if len(top_five_groups) != top_five_target:
                issues.append(
                    f"expected {top_five_target} top five group(s), got {len(top_five_groups)}"
                )
            if issues:
                return ("fail", "; ".join(issues))
            return (
                "pass",
                f"menu clusterer produced {len(hook_groups)} hook Reel cluster(s) and "
                f"{len(top_five_groups)} top five group(s).",
            )
        if uses_top_five_only or (wants_top_five and not wants_hook):
            top_five_target = _top_five_group_count(data)
            if len(top_five_groups) < MENU_CLUSTERER_MIN_GROUP_COUNT:
                return (
                    "fail",
                    f"menu clusterer has {len(top_five_groups)} top five group(s); minimum is "
                    f"{MENU_CLUSTERER_MIN_GROUP_COUNT}.",
                )
            if len(top_five_groups) != top_five_target:
                return (
                    "fail",
                    f"menu clusterer has {len(top_five_groups)} top five group(s); expected "
                    f"{top_five_target}.",
                )
            return (
                "pass",
                f"menu clusterer produced {len(top_five_groups)} top five group(s) "
                f"(target {top_five_target}).",
            )
        hook_target = _target_group_count(data)
        if len(hook_groups) < MENU_CLUSTERER_MIN_GROUP_COUNT:
            return (
                "fail",
                f"menu clusterer has {len(hook_groups)} hook Reel cluster(s); minimum is "
                f"{MENU_CLUSTERER_MIN_GROUP_COUNT}.",
            )
        if len(hook_groups) != hook_target:
            return (
                "fail",
                f"menu clusterer has {len(hook_groups)} hook Reel cluster(s); expected {hook_target}.",
            )
        return (
            "pass",
            f"menu clusterer produced {len(hook_groups)} hook Reel cluster(s) (target {hook_target}).",
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
            "each cluster includes a clusterDescription explaining grouping and venue fit.",
        )

    if (
        ("same" in norm and "category" in norm and ("mixed" in norm or "hook" in norm or "creative" in norm or "categorical" in norm))
        or ("category scope" in norm)
        or (
            ("mixed-category" in norm or "creative" in norm)
            and ("same" in norm or "categorical" in norm)
            and ("hook" in norm or "reel" in norm or "pos" in norm or "tag" in norm)
        )
    ):
        if uses_top_five_only or not hook_groups:
            if not hook_groups:
                return ("fail", "menu clusterer data has no hook Reel clusters.")
            if len(_top_five_groups(groups)) >= 2:
                return (
                    "pass",
                    "top five groups provide per-category coverage; hook Reel category scope "
                    "applies when hook clusters are present.",
                )
        pos_categories = {
            str(row.get("category") or "").strip().casefold()
            for group in hook_groups
            for row in (group.get("items") or [])
            if isinstance(row, dict) and str(row.get("category") or "").strip()
        }
        if len(pos_categories) <= 1:
            if hook_groups and all(is_same_category_group(group) for group in hook_groups):
                return (
                    "pass",
                    "hook Reel clusters are same-POS-category only because the tagged menu "
                    "spans a single category.",
                )
            return ("fail", "hook Reel clusters must be same-category for a single-category menu.")
        scope_issues = _hook_category_scope_issues(hook_groups)
        if scope_issues:
            return ("fail", "; ".join(scope_issues[:4]))
        return (
            "pass",
            "hook Reel clusters include both categorical (same POS category) and creative "
            "(cross-category) groups grounded in menu tagger tags.",
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
        position_issues: list[str] = []
        wants_top_five = (
            "top five" in norm
            or "top_five" in norm
            or "signature" in norm
            or ("top star" in norm or "category" in norm)
        )
        wants_hook = (
            "hook" in norm
            or "reel" in norm
            or "score-tier" in norm
            or "score tier" in norm
            or ("top" in norm and "5" in norm and "hook" in norm)
        )
        if top_five_groups and wants_top_five:
            position_issues.extend(
                _validate_top_five_groups(
                    top_five_groups,
                    empty_message="no menu clusterer top five groups to validate.",
                )
            )
        if hook_groups and wants_hook:
            top5_names = {
                str(name).strip().casefold()
                for name in (data.get("topFoodLeadNames") or [])
                if str(name).strip()
            }
            position_issues.extend(_validate_hook_reel_groups(hook_groups, top5_names=top5_names))
        if position_issues:
            return ("fail", "; ".join(position_issues[:4]))
        if wants_top_five and wants_hook:
            return (
                "pass",
                "hook Reel leads are top popularity score-tier items and top five group leads are "
                "top stars in their categories.",
            )
        if wants_top_five:
            return (
                "pass",
                "each top five group lead is the top star in its category by popularity.",
            )
        return (
            "pass",
            "each hook Reel cluster position-1 item is a top popularity score-tier food lead.",
        )

    return None
