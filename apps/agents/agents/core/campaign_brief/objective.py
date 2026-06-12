"""Campaign objective normalization and completeness checks for campaign brief."""

from __future__ import annotations

import re

FUNNEL_STAGE_MARKERS = (
    "awareness",
    "consideration",
    "conversion",
    "retention",
    "loyalty",
    "top of funnel",
    "mid funnel",
    "middle of funnel",
    "bottom funnel",
    "funnel",
    "stage",
)

OUTCOME_VERBS = (
    "increase",
    "grow",
    "boost",
    "drive",
    "improve",
    "raise",
    "maximize",
    "expand",
    "build",
    "lift",
)

_FUNNEL_TAIL_RE = re.compile(
    r"\s+(?P<sep>during|in|at)\s+(?P<tail>.+)$",
    re.IGNORECASE,
)


def campaign_objective_has_funnel_hint(text: str) -> bool:
    lower = text.strip().lower()
    return any(marker in lower for marker in FUNNEL_STAGE_MARKERS)


def campaign_objective_has_dual_outcome(text: str) -> bool:
    """True when the business-outcome portion lists two coordinated primary outcomes."""
    cleaned = text.strip()
    if not cleaned or " and " not in cleaned.lower():
        return False

    business = cleaned
    match = _FUNNEL_TAIL_RE.search(cleaned)
    if match and campaign_objective_has_funnel_hint(match.group("tail")):
        business = cleaned[: match.start()].strip()

    if " and " not in business.lower():
        return False

    segments = re.split(r"\s+and\s+", business, flags=re.IGNORECASE)
    outcome_segments = [
        segment.strip()
        for segment in segments
        if segment.strip() and any(verb in segment.lower() for verb in OUTCOME_VERBS)
    ]
    return len(outcome_segments) >= 2


def normalize_campaign_objective(text: str) -> str:
    """Keep one primary business outcome; preserve funnel-stage tail when present."""
    cleaned = text.strip()
    if not cleaned or not campaign_objective_has_dual_outcome(cleaned):
        return cleaned

    funnel_tail = ""
    business = cleaned
    match = _FUNNEL_TAIL_RE.search(cleaned)
    if match and campaign_objective_has_funnel_hint(match.group("tail")):
        funnel_tail = f" {match.group('sep').lower()} {match.group('tail').strip()}"
        business = cleaned[: match.start()].strip()

    primary = re.split(r"\s+and\s+", business, maxsplit=1, flags=re.IGNORECASE)[0].strip()
    if not primary:
        return cleaned

    combined = f"{primary}{funnel_tail}".strip()
    if campaign_objective_has_funnel_hint(combined):
        return combined
    if campaign_objective_has_funnel_hint(cleaned):
        return combined
    return f"{primary} in conversion stage"
