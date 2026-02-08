from enum import Enum


class SignalType(str, Enum):
    """
    Dynamic economic states detected for menu items.

    Signals represent situational awareness —
    they highlight where attention is needed NOW.

    IMPORTANT:

    - Signals are temporal.
    - Signals must remain deterministic.
    - Signals should drive action.

    Avoid creating signals that do not
    influence decisions.
    """

    # -----------------------------------------------------
    # PROMOTION INTELLIGENCE
    # -----------------------------------------------------

    PROMOTION_READY = "promotion_ready"
    """
    Item is economically strong and behaviorally predictable.

    STRATEGIC MEANING:
        Safe to promote.
        Likely to generate incremental revenue.
    """

    MOMENTUM = "momentum"
    """
    Demand is accelerating.

    STRATEGIC MEANING:
        Capture the wave early with promotion.
    """

    OVEREXPOSED = "overexposed"
    """
    Item already dominates demand.

    STRATEGIC MEANING:
        Additional promotion may strain operations
        without creating meaningful upside.
    """

    DEAD_WINDOW_OPPORTUNITY = "dead_window_opportunity"
    """
    Strong item with underutilized selling hours.

    STRATEGIC MEANING:
        Activate new revenue windows.
    """

    # -----------------------------------------------------
    # RISK INTELLIGENCE
    # -----------------------------------------------------

    PROFIT_AT_RISK = "profit_at_risk"
    """
    A profit-driving item shows weakening performance.

    STRATEGIC MEANING:
        Investigate immediately.
        Protect revenue stability.
    """

    DRAG_ALERT = "drag_alert"
    """
    Persistently weak item.

    STRATEGIC MEANING:
        Avoid promoting.
        Consider removal or reformulation.
    """


# =========================================================
# SIGNAL GROUPINGS
# =========================================================
# These groupings act as semantic shortcuts for the
# decision engine and future agents.
#
# Using frozenset ensures they remain immutable.
# =========================================================

PROMOTION_SIGNALS = frozenset(
    {
        SignalType.PROMOTION_READY,
        SignalType.MOMENTUM,
        SignalType.DEAD_WINDOW_OPPORTUNITY,
    }
)

RISK_SIGNALS = frozenset(
    {
        SignalType.PROFIT_AT_RISK,
        SignalType.DRAG_ALERT,
    }
)

CONSTRAINT_SIGNALS = frozenset(
    {
        SignalType.OVEREXPOSED,
    }
)
