"""Helpers for prior-milestone context used by inject_prior_presets."""

from __future__ import annotations

from typing import Any


def _is_campaign_brief_dict(data: dict[str, Any]) -> bool:
    vs = data.get("venueSnapshot")
    return bool(
        isinstance(vs, dict)
        and isinstance(data.get("contentPillars"), list)
        and isinstance(data.get("audienceHypotheses"), list)
        and isinstance(data.get("proofOrientedAngles"), list)
        and isinstance(data.get("toneGuardrails"), list)
    )


def is_campaign_brief_milestone_data(data: dict[str, Any]) -> bool:
    """True if ``data`` matches saved ``restaurant_campaign_brief`` milestonedata shape."""
    return _is_campaign_brief_dict(data)
