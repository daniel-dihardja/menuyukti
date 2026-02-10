from typing import Set, Callable, List

from app.marketing_engine.decision.enrichment.enriched_menu_item import EnrichedMenuItem
from app.marketing_engine.decision.roles.role_types import RoleType
from app.marketing_engine.decision.signals.signal_types import (
    SignalType,
)


# =========================================================
# Individual Signal Detectors
# Each detector focuses on ONE economic meaning.
# Keep them small and obvious.
# =========================================================


def detect_promotion_ready(
    item: EnrichedMenuItem,
    roles: Set[RoleType],
) -> Set[SignalType]:

    signals = set()

    if RoleType.GROWTH_LEVER in roles:

        # predictable demand window
        if item.behavioral.peak_share >= 0.15 and item.behavioral.dead_hours <= 12:
            signals.add(SignalType.PROMOTION_READY)

    return signals


# ---------------------------------------------------------


def detect_momentum(
    item: EnrichedMenuItem,
    roles: Set[RoleType],
) -> Set[SignalType]:
    """
    Placeholder momentum logic.

    True momentum requires historical comparison.
    For now we approximate via demand concentration.
    """

    signals = set()

    if item.behavioral.demand_concentration >= 0.55:
        signals.add(SignalType.MOMENTUM)

    return signals


# ---------------------------------------------------------


def detect_profit_risk(
    item: EnrichedMenuItem,
    roles: Set[RoleType],
) -> Set[SignalType]:

    signals = set()

    if RoleType.PROFIT_ANCHOR in roles:

        # weak behavioral stability
        if item.behavioral.peak_share < 0.10:
            signals.add(SignalType.PROFIT_AT_RISK)

    return signals


# ---------------------------------------------------------


def detect_dead_window(
    item: EnrichedMenuItem,
    roles: Set[RoleType],
) -> Set[SignalType]:

    signals = set()

    if RoleType.VELOCITY_DRIVER in roles or RoleType.GROWTH_LEVER in roles:
        if item.behavioral.dead_hours >= 14:
            signals.add(SignalType.DEAD_WINDOW_OPPORTUNITY)

    return signals


# ---------------------------------------------------------


def detect_overexposed(
    item: EnrichedMenuItem,
    roles: Set[RoleType],
) -> Set[SignalType]:

    signals = set()

    if item.behavioral.peak_share >= 0.35:
        signals.add(SignalType.OVEREXPOSED)

    return signals


# ---------------------------------------------------------


def detect_drag(
    item: EnrichedMenuItem,
    roles: Set[RoleType],
) -> Set[SignalType]:

    signals = set()

    if RoleType.DRAG in roles:
        signals.add(SignalType.DRAG_ALERT)

    return signals


# =========================================================
# MASTER SIGNAL ENGINE
# =========================================================

DETECTORS: List[Callable[[EnrichedMenuItem, Set[RoleType]], Set[SignalType]]] = [
    detect_promotion_ready,
    detect_momentum,
    detect_profit_risk,
    detect_dead_window,
    detect_overexposed,
    detect_drag,
]


def detect_signals(
    item: EnrichedMenuItem,
    roles: Set[RoleType],
) -> Set[SignalType]:
    """
    Runs all signal detectors and aggregates results.

    This function is intentionally simple.
    Complexity belongs inside detectors.
    """

    signals: Set[SignalType] = set()

    for detector in DETECTORS:
        signals.update(detector(item, roles))

    return signals
