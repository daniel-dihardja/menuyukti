from pydantic import BaseModel, Field
from typing import FrozenSet
from datetime import time
from enum import Enum

from app.marketing_engine.decision.enrichment.enriched_menu_item import EnrichedMenuItem
from app.marketing_engine.decision.roles.role_types import RoleType
from app.marketing_engine.decision.signals.signal_types import SignalType
from app.marketing_engine.decision.decisions.promotion_decision_types import (
    PromotionDecision,
)


# =========================================================
# Promotion Priority
# ---------------------------------------------------------
# Determines how aggressively attention should be allocated.
# This is NOT a score — it is an execution signal.
# =========================================================


class PromotionPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# =========================================================
# Promotion Candidate
# ---------------------------------------------------------
# Represents a pre-approved promotion opportunity.
#
# This object is intentionally compressed so that agents
# do NOT need to reason — only execute.
# =========================================================


class PromotionCandidate(BaseModel):

    # -----------------------------------------------------
    # Identity
    # -----------------------------------------------------

    menu: str
    menu_category: str
    menu_category_detail: str | None = None

    # -----------------------------------------------------
    # Decision Context
    # -----------------------------------------------------

    decision: PromotionDecision
    priority: PromotionPriority

    roles: FrozenSet[RoleType] = Field(default_factory=frozenset)
    signals: FrozenSet[SignalType] = Field(default_factory=frozenset)

    # -----------------------------------------------------
    # Economic Weight
    # -----------------------------------------------------
    # Used for ranking opportunities automatically.
    # Higher weight = stronger financial impact.
    # -----------------------------------------------------

    profit_velocity: float
    contribution_share: float
    economic_weight: float

    # -----------------------------------------------------
    # Behavioral Timing
    # -----------------------------------------------------

    peak_hour: int
    recommended_post_time: time

    # -----------------------------------------------------
    # Execution Guidance
    # -----------------------------------------------------

    decision_reason: str
    expected_behavior: str
    requires_discount: bool = False

    # -----------------------------------------------------
    # Sorting Helper
    # -----------------------------------------------------

    @property
    def decision_rank(self) -> int:
        """
        Enables deterministic sorting.

        PROMOTE always outranks CONSIDER.
        """
        return {
            PromotionDecision.PROMOTE: 0,
            PromotionDecision.CONSIDER: 1,
            PromotionDecision.DO_NOT_PROMOTE: 2,
        }[self.decision]

    # =====================================================
    # Factory Constructor
    # =====================================================

    @classmethod
    def from_decision(
        cls,
        enriched: EnrichedMenuItem,
        roles: set[RoleType],
        signals: set[SignalType],
        decision: PromotionDecision,
    ) -> "PromotionCandidate":

        peak = enriched.behavioral.peak_hour

        # ---------------------------------------------
        # Post BEFORE demand peak.
        # Starting heuristic: 75 minutes prior.
        # ---------------------------------------------
        post_hour = max(0, peak - 1)
        recommended_time = time(hour=post_hour, minute=15)

        # ---------------------------------------------
        # Economic Weight
        # ---------------------------------------------
        economic_weight = (
            enriched.economic.profit_velocity * enriched.economic.contribution_share
        )

        # ---------------------------------------------
        # Priority Derivation
        # ---------------------------------------------
        if decision == PromotionDecision.PROMOTE and RoleType.PROFIT_ANCHOR in roles:
            priority = PromotionPriority.CRITICAL

        elif decision == PromotionDecision.PROMOTE and RoleType.GROWTH_LEVER in roles:
            priority = PromotionPriority.HIGH

        elif decision == PromotionDecision.CONSIDER:
            priority = PromotionPriority.MEDIUM

        else:
            priority = PromotionPriority.LOW

        # ---------------------------------------------
        # Decision Reason (Deterministic)
        # ---------------------------------------------
        reason_bits = []

        if RoleType.GROWTH_LEVER in roles:
            reason_bits.append("high-margin growth lever")

        if SignalType.PROMOTION_READY in signals:
            reason_bits.append("predictable demand window")

        if SignalType.MOMENTUM in signals:
            reason_bits.append("demand momentum detected")

        if RoleType.PROFIT_ANCHOR in roles:
            reason_bits.append("significant profit contributor")

        if not reason_bits:
            reason_bits.append("meets baseline promotion criteria")

        decision_reason = ", ".join(reason_bits)

        # ---------------------------------------------
        # Expected Behavior
        # ---------------------------------------------
        if RoleType.GROWTH_LEVER in roles:
            expected_behavior = "drive incremental revenue"

        elif RoleType.VELOCITY_DRIVER in roles:
            expected_behavior = "accelerate cashflow"

        elif RoleType.TRAFFIC_DRIVER in roles:
            expected_behavior = "increase customer traffic"

        elif RoleType.PROFIT_ANCHOR in roles:
            expected_behavior = "protect core revenue"

        else:
            expected_behavior = "support baseline sales"

        # ---------------------------------------------
        # Discount Detection (VERY conservative)
        # ---------------------------------------------
        requires_discount = False  # leave false unless pricing logic exists

        return cls(
            menu=enriched.matrix.menu,
            menu_category=enriched.matrix.menu_category,
            menu_category_detail=enriched.matrix.menu_category_detail,
            decision=decision,
            priority=priority,
            roles=frozenset(roles),
            signals=frozenset(signals),
            profit_velocity=enriched.economic.profit_velocity,
            contribution_share=enriched.economic.contribution_share,
            economic_weight=economic_weight,
            peak_hour=peak,
            recommended_post_time=recommended_time,
            decision_reason=decision_reason,
            expected_behavior=expected_behavior,
            requires_discount=requires_discount,
        )
