"""Shared relative-demand thresholds and promo posture labels."""

from __future__ import annotations

from typing import Literal

RelativeDemand = Literal["low", "average", "high"]
PromoPosture = Literal["support", "promote", "maintain"]

LOW_DEMAND_THRESHOLD = 0.9
HIGH_DEMAND_THRESHOLD = 1.1


def relative_demand(demand_index: float) -> RelativeDemand:
    """Classify a demand index relative to the series mean (1.0 = average)."""
    if demand_index < LOW_DEMAND_THRESHOLD:
        return "low"
    if demand_index > HIGH_DEMAND_THRESHOLD:
        return "high"
    return "average"


def posture_from_relative(relative: RelativeDemand) -> PromoPosture:
    """Map relative demand to a promo posture for content/campaign planning."""
    if relative == "high":
        return "support"
    if relative == "low":
        return "promote"
    return "maintain"
