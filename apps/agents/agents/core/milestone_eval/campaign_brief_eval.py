"""Deterministic pass/fail checks for restaurant campaign brief milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

from agents_app.agents.core.campaign_brief.objective import (
    campaign_objective_has_dual_outcome,
    campaign_objective_has_funnel_hint,
)

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

_CAMPAIGN_BRIEF_LIST_KEYS = (
    "contentPillars",
    "audienceHypotheses",
    "proofOrientedAngles",
    "toneGuardrails",
    "targetSegments",
    "messageHierarchy",
    "offerAndCtaPlan",
    "contentPillarPlan",
    "measurementPlan",
    "testingPlan",
    "riskGuardrails",
)


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_campaign_brief_milestone_data(data: dict[str, Any]) -> bool:
    venue = data.get("venueSnapshot")
    objective = data.get("campaignObjective")
    return isinstance(venue, dict) and isinstance(objective, str)


def enrich_campaign_brief_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    if not is_campaign_brief_milestone_data(data):
        return data
    objective = str(data.get("campaignObjective") or "").strip()
    enriched = dict(data)
    enriched["_evalHints"] = {
        "campaignObjectiveDualOutcome": campaign_objective_has_dual_outcome(objective),
        "campaignObjectiveHasFunnelHint": campaign_objective_has_funnel_hint(objective),
        "listFieldKeys": list(_CAMPAIGN_BRIEF_LIST_KEYS),
    }
    return enriched


def _list_field_from_requirement(norm: str) -> str | None:
    mapping = {
        "content pillars": "contentPillars",
        "audience hypotheses": "audienceHypotheses",
        "proof-oriented angles": "proofOrientedAngles",
        "proof oriented angles": "proofOrientedAngles",
        "tone guardrails": "toneGuardrails",
        "target segments": "targetSegments",
        "message hierarchy": "messageHierarchy",
        "offer and cta plan": "offerAndCtaPlan",
        "content pillar plan": "contentPillarPlan",
        "measurement plan": "measurementPlan",
        "testing plan": "testingPlan",
        "risk guardrails": "riskGuardrails",
    }
    for label, key in mapping.items():
        if label in norm:
            return key
    return None


def _unique_non_empty_strings(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    seen: set[str] = set()
    out: list[str] = []
    for raw in values:
        text = str(raw).strip()
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        out.append(text)
    return out


def try_campaign_brief_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    if not is_campaign_brief_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)

    if "campaign objective" in norm:
        objective = str(data.get("campaignObjective") or "").strip()
        if not objective:
            return ("fail", "campaignObjective is empty.")
        if campaign_objective_has_dual_outcome(objective):
            return (
                "fail",
                "campaignObjective lists more than one primary business outcome; use one outcome plus a funnel stage.",
            )
        if not campaign_objective_has_funnel_hint(objective):
            return ("fail", "campaignObjective does not state a dominant funnel stage.")
        return (
            "pass",
            "campaignObjective states one primary business outcome and a funnel stage.",
        )

    if "venue snapshot" in norm:
        venue = data.get("venueSnapshot")
        if not isinstance(venue, dict):
            return ("fail", "venueSnapshot is missing.")
        name = str(venue.get("venueName") or "").strip()
        if not name:
            return ("fail", "venueSnapshot.venueName is empty.")
        return ("pass", "venueSnapshot includes venue identity fields.")

    list_key = _list_field_from_requirement(norm)
    if list_key is not None:
        items = _unique_non_empty_strings(data.get(list_key))
        if 3 <= len(items) <= 5:
            return ("pass", f"{list_key} has {len(items)} unique non-empty items.")
        return (
            "fail",
            f"{list_key} must contain 3-5 unique non-empty items (found {len(items)}).",
        )

    if "overall strategy" in norm:
        strategy = data.get("overallStrategy")
        if not isinstance(strategy, dict):
            return ("fail", "overallStrategy is missing.")
        required = (
            "strategyFocus",
            "audiencePriority",
            "coreMessage",
            "offerWindow",
            "cadenceGuidance",
        )
        missing = [key for key in required if not str(strategy.get(key) or "").strip()]
        if (
            isinstance(strategy.get("audiencePriority"), list)
            and len(_unique_non_empty_strings(strategy.get("audiencePriority"))) < 3
        ):
            missing.append("audiencePriority items")
        if (
            isinstance(strategy.get("cadenceGuidance"), list)
            and len(_unique_non_empty_strings(strategy.get("cadenceGuidance"))) < 3
        ):
            missing.append("cadenceGuidance items")
        if missing:
            return ("fail", f"overallStrategy missing required fields: {', '.join(missing)}.")
        return ("pass", "overallStrategy includes required strategy fields.")

    return None
