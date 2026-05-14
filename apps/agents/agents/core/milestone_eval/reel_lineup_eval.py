"""Deterministic pass/fail checks for reel_lineup milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

REEL_LINEUP_GROUP_MIN_SIZE = 1
REEL_LINEUP_GROUP_MAX_SIZE = 5
REEL_LINEUP_MAX_LEADS = 5


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
        "leadIsFirstItem": True,
    }
    return enriched


def _groups(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("groups")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _is_main_course_strong_story_lead(item: dict[str, Any]) -> bool:
    storytelling = str(item.get("storytellingFit") or "").strip().lower()
    if storytelling != "strong":
        return False
    reel_moment = str(item.get("reelMoment") or "").strip()
    return bool(reel_moment)


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

    if ("up to" in norm or "at most" in norm) and "5" in norm and (
        "group" in norm or "hook" in norm or "reel" in norm
    ):
        if len(groups) > REEL_LINEUP_MAX_LEADS:
            return ("fail", f"reel lineup has {len(groups)} groups; maximum is {REEL_LINEUP_MAX_LEADS}.")
        if not groups:
            return ("fail", "no reel lineup hook groups to validate.")
        return ("pass", f"reel lineup produced {len(groups)} hook group(s) (at most {REEL_LINEUP_MAX_LEADS}).")

    if "main" in norm and "storytelling" in norm and ("position" in norm or "lead" in norm or "hook" in norm):
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
            if not _is_main_course_strong_story_lead(first):
                issues.append(f"{group.get('id') or 'group'} hook lacks strong storytelling")
                continue
            lead_name = str(group.get("leadName") or "").strip()
            first_name = str(first.get("name") or "").strip()
            if lead_name and first_name and lead_name.casefold() != first_name.casefold():
                issues.append(f"{group.get('id') or 'group'} leadName does not match hook item")
        if issues:
            return ("fail", "; ".join(issues[:4]))
        if not groups:
            return ("fail", "no reel lineup hook groups to validate.")
        return ("pass", "each hook group lead is a main-course item with strong storytelling at position 1.")

    return None
