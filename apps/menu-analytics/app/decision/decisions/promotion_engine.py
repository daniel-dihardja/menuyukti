from typing import Set

from app.decision.enrichment.enriched_menu_item import EnrichedMenuItem
from app.decision.roles.role_types import RoleType
from app.decision.signals.signal_types import (
    SignalType,
    RISK_SIGNALS,
    PROMOTION_SIGNALS,
    CONSTRAINT_SIGNALS,
)
from app.decision.decisions.promotion_decision_types import (
    PromotionDecision,
)


def promotion_decision(
    item: EnrichedMenuItem,
    roles: Set[RoleType],
    signals: Set[SignalType],
) -> PromotionDecision:
    """
    Determines whether a menu item should be promoted.

    Decision hierarchy:

        1. Risk blocks promotion
        2. Strong signals trigger promotion
        3. Otherwise consider
    """

    # -----------------------------------------------------
    # HARD BLOCKERS
    # Risk always overrides opportunity.
    # -----------------------------------------------------

    if signals & RISK_SIGNALS:
        return PromotionDecision.DO_NOT_PROMOTE

    if signals & CONSTRAINT_SIGNALS:
        return PromotionDecision.DO_NOT_PROMOTE

    # -----------------------------------------------------
    # STRONG PROMOTION
    # -----------------------------------------------------

    if SignalType.PROMOTION_READY in signals:
        return PromotionDecision.PROMOTE

    if RoleType.GROWTH_LEVER in roles and signals & PROMOTION_SIGNALS:
        return PromotionDecision.PROMOTE

    # -----------------------------------------------------
    # SOFT PROMOTION
    # -----------------------------------------------------

    if RoleType.VELOCITY_DRIVER in roles:
        return PromotionDecision.CONSIDER

    if RoleType.TRAFFIC_DRIVER in roles:
        return PromotionDecision.CONSIDER

    # -----------------------------------------------------
    # Default Safety
    # -----------------------------------------------------

    return PromotionDecision.DO_NOT_PROMOTE
