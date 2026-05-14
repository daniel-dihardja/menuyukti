"""Deterministic pass/fail checks for reel_lineup milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

REEL_LINEUP_GROUP_MIN_SIZE = 3
REEL_LINEUP_GROUP_MAX_SIZE = 5


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
        "leadIsFirstItem": True,
        "sharedAnchorDimension": "reel_moment",
    }
    return enriched


def _groups(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("groups")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _is_drink_category(category: str) -> bool:
    normalized = category.strip().upper()
    return normalized == "DRINK" or normalized == "DRINKS" or normalized.startswith("DRINK")


def _is_drink_group_item(item: dict[str, Any]) -> bool:
    return _is_drink_category(str(item.get("category") or ""))


def _drink_items_in_groups(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    drinks: list[dict[str, Any]] = []
    for group in groups:
        items = group.get("items")
        if not isinstance(items, list):
            continue
        for item in items:
            if isinstance(item, dict) and _is_drink_group_item(item):
                drinks.append(item)
    return drinks


def _group_item_names(data: dict[str, Any]) -> set[str]:
    names: set[str] = set()
    for group in _groups(data):
        items = group.get("items")
        if not isinstance(items, list):
            continue
        for item in items:
            if isinstance(item, dict):
                name = str(item.get("name") or "").strip()
                if name:
                    names.add(name.casefold())
    return names


def try_reel_lineup_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_reel_lineup_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    groups = _groups(data)

    if "menu_tagger" in norm and ("prior" in norm or "earlier" in norm or "run used" in norm):
        if not groups:
            return ("fail", "reel lineup data has no groups from prior menu_tagger items.")
        return ("pass", f"reel lineup produced {len(groups)} group(s) from tagged items.")

    if ("3" in norm and "5" in norm) or ("three" in norm and "five" in norm) or "3–5" in norm:
        issues: list[str] = []
        for group in groups:
            items = group.get("items")
            count = len(items) if isinstance(items, list) else 0
            if not (REEL_LINEUP_GROUP_MIN_SIZE <= count <= REEL_LINEUP_GROUP_MAX_SIZE):
                issues.append(f"{group.get('id') or 'group'} has {count} items")
        if issues:
            return ("fail", "; ".join(issues[:4]))
        if not groups:
            return ("fail", "no reel lineup groups to validate.")
        return ("pass", "every group contains between 3 and 5 menu items.")

    if "star" in norm and ("lead" in norm or "hook" in norm or "starts" in norm):
        issues: list[str] = []
        for group in groups:
            items = group.get("items")
            if not isinstance(items, list) or not items:
                issues.append(f"{group.get('id') or 'group'} has no items")
                continue
            first = items[0] if isinstance(items[0], dict) else {}
            if str(first.get("role") or "") != "star":
                issues.append(f"{group.get('id') or 'group'} lead is not a star")
            lead_name = str(group.get("leadName") or "").strip()
            first_name = str(first.get("name") or "").strip()
            if lead_name and first_name and lead_name.casefold() != first_name.casefold():
                issues.append(f"{group.get('id') or 'group'} leadName does not match first item")
        if issues:
            return ("fail", "; ".join(issues[:4]))
        if not groups:
            return ("fail", "no reel lineup groups to validate.")
        return ("pass", "each group starts with a star lead item.")

    if "reel_moment" in norm and ("share" in norm or "same" in norm or "anchor" in norm):
        issues: list[str] = []
        for group in groups:
            anchor = group.get("anchor")
            anchor_value = ""
            if isinstance(anchor, dict):
                anchor_value = str(anchor.get("value") or "").strip()
            items = group.get("items")
            if not isinstance(items, list):
                continue
            moments = {
                str(item.get("reelMoment") or "").strip()
                for item in items
                if isinstance(item, dict)
                and not _is_drink_group_item(item)
                and str(item.get("reelMoment") or "").strip()
            }
            if anchor_value and moments and (moments != {anchor_value}):
                issues.append(f"{group.get('id') or 'group'} has mixed reel_moment values")
        if issues:
            return ("fail", "; ".join(issues[:4]))
        if not groups:
            return ("fail", "no reel lineup groups to validate.")
        return ("pass", "food items within each group share the same reel_moment anchor.")

    if "drink" in norm and ("end" in norm or "last" in norm):
        drinks_in_groups = _drink_items_in_groups(groups)
        if not drinks_in_groups:
            return ("pass", "no drink items in lineup data.")
        issues: list[str] = []
        for group in groups:
            items = group.get("items")
            if not isinstance(items, list) or not items:
                continue
            drink_positions = [
                index
                for index, item in enumerate(items)
                if isinstance(item, dict) and _is_drink_group_item(item)
            ]
            if len(drink_positions) > 1:
                issues.append(f"{group.get('id') or 'group'} has multiple drinks")
                continue
            if drink_positions and drink_positions[0] != len(items) - 1:
                issues.append(f"{group.get('id') or 'group'} drink is not last")
                continue
            if not drink_positions:
                issues.append(f"{group.get('id') or 'group'} has no drink")
        if issues:
            if len(drinks_in_groups) < len(groups):
                return (
                    "pass",
                    "drink pool exhausted; remaining groups use food-only fallback.",
                )
            return ("fail", "; ".join(issues[:4]))
        if not groups:
            return ("fail", "no reel lineup groups to validate.")
        return ("pass", "each group ends with a drink item.")

    if "menu_tagger" in norm and "subset" in norm:
        tagged_names = {
            str(name).casefold()
            for name in (data.get("_menuTaggerItemNames") or [])
            if str(name).strip()
        }
        if tagged_names:
            lineup_names = _group_item_names(data)
            extra = lineup_names - tagged_names
            if extra:
                return ("fail", "lineup includes items not present in menu_tagger data.")
            return ("pass", "all lineup items come from menu_tagger data.")

    return None
