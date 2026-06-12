"""Deterministic pass/fail checks for reel_lineup milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

from agents_app.agents.core.milestone_run.dates_window import count_campaign_weeks

DeterministicVerdict = tuple[Literal["pass", "fail"], str]


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_reel_lineup_milestone_data(data: dict[str, Any]) -> bool:
    return isinstance(data.get("reels"), list)


def enrich_reel_lineup_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_reel_lineup_milestone_data(data):
        return data
    enriched = dict(data)
    reels = _reels(data)
    intents = [str(reel.get("intent") or "").strip() for reel in reels]
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    expected_weeks = count_campaign_weeks(start_date, end_date) if start_date and end_date else None
    enriched["_evalHints"] = {
        "reelCount": len(reels),
        "intents": intents,
        "expectedReelCount": (expected_weeks * 2) if expected_weeks is not None else None,
        "expectedWeeklyReelPairs": expected_weeks,
    }
    return enriched


def _reels(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("reels")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def _reels_by_intent(reels: list[dict[str, Any]], intent: str) -> list[dict[str, Any]]:
    return [reel for reel in reels if str(reel.get("intent") or "").strip() == intent]


def _reels_have_copy_fields(reels: list[dict[str, Any]]) -> list[str]:
    issues: list[str] = []
    for index, reel in enumerate(reels, start=1):
        title = str(reel.get("title") or "").strip()
        description = str(reel.get("description") or "").strip()
        explanation = str(reel.get("explanation") or "").strip()
        if not title:
            issues.append(f"reel {index} is missing title")
        if not description:
            issues.append(f"reel {index} is missing description")
        if not explanation:
            issues.append(f"reel {index} is missing explanation")
    return issues


def try_reel_lineup_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_reel_lineup_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    reels = _reels(data)
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()

    if "dates" in norm and ("prior" in norm or "earlier" in norm or "run used" in norm):
        if not start_date or not end_date:
            return ("fail", "reel lineup data is missing startDate and endDate from prior dates.")
        if not str(data.get("sourceDatesTitle") or "").strip() and not reels:
            return ("fail", "reel lineup data has no saved window from prior dates milestone.")
        return ("pass", "reel lineup used prior dates milestone for the campaign window.")

    if ("campaign brief" in norm or "campaign_brief" in norm) and (
        "prior" in norm or "earlier" in norm or "run used" in norm
    ):
        if not reels:
            return ("fail", "reel lineup data has no reels from prior campaign brief context.")
        return (
            "pass",
            "reel lineup used prior restaurant_campaign_brief context for reel planning.",
        )

    if ("menu_clusterer" in norm or "menu clusterer" in norm) and (
        "prior" in norm or "earlier" in norm or "run used" in norm
    ):
        if not reels:
            return ("fail", "reel lineup data has no reels from prior menu clusterer groups.")
        has_group_ids = any(
            isinstance(reel.get("groupIds"), list) and len(reel.get("groupIds") or []) > 0
            for reel in reels
        )
        if not has_group_ids:
            return ("fail", "reel lineup reels are missing menu clusterer groupIds.")
        return (
            "pass",
            f"reel lineup produced {len(reels)} reel concept(s) from menu clusterer groups.",
        )

    if "weekday" in norm and "weekend" in norm and ("intent" in norm or "reel" in norm):
        weekday_reels = _reels_by_intent(reels, "weekday_reel")
        weekend_reels = _reels_by_intent(reels, "weekend_reel")
        if not weekday_reels or not weekend_reels:
            return ("fail", "reel lineup must include both weekday_reel and weekend_reel entries.")
        return (
            "pass",
            f"reel lineup includes {len(weekday_reels)} weekday and {len(weekend_reels)} weekend reels.",
        )

    if "two" in norm and "reel" in norm and ("week" in norm or "per week" in norm):
        if start_date and end_date:
            expected_weeks = count_campaign_weeks(start_date, end_date)
            expected_reels = expected_weeks * 2
            if len(reels) != expected_reels:
                return (
                    "fail",
                    f"reel lineup must include two reels per week; "
                    f"expected {expected_reels}, got {len(reels)}.",
                )
            return (
                "pass",
                f"reel lineup includes {len(reels)} reels (two per campaign week).",
            )
        if len(reels) < 2:
            return ("fail", "reel lineup must include at least two reels.")
        return ("pass", f"reel lineup includes {len(reels)} reel(s).")

    if "description" in norm and "explanation" in norm:
        issues = _reels_have_copy_fields(reels)
        if issues:
            return ("fail", "; ".join(issues[:4]))
        return ("pass", "every reel has non-empty title, description, and explanation.")

    if "static" in norm and "hero" in norm and ("group" in norm or "cluster" in norm):
        if not reels:
            return ("fail", "reel lineup has no reels with static hero groups.")
        missing_groups = [
            reel
            for reel in reels
            if not isinstance(reel.get("groupIds"), list) or not reel.get("groupIds")
        ]
        if missing_groups:
            return ("fail", "some reels are missing groupIds from static hero assignment.")
        return ("pass", "reel lineup reels reference menu clusterer hero groupIds.")

    if "reel" in norm and ("present" in norm or "planned" in norm or "concept" in norm):
        if not reels:
            return ("fail", "reel lineup has no planned reels.")
        return ("pass", f"reel lineup includes {len(reels)} planned reel(s).")

    return None
