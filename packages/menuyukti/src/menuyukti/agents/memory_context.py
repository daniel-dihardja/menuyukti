"""
Memory Context Agent

Track and provide contextual information about previous decisions and outcomes.

Pure function (no frameworks). Used by apps/agents/memory_context.py.
"""

from typing import Literal


RecommendationState = Literal["accepted", "rejected"]


def filter_recent_events(
    events: list[dict],
    max_items: int = 10,
) -> list[dict]:
    """
    Filter and sort events by version and creation date.

    Returns most recent events up to max_items.

    Args:
        events: List of memory events
        max_items: Maximum number of events to return

    Returns:
        Recent events sorted by (version desc, created_at desc)
    """
    if not events:
        return []

    sorted_events = sorted(
        events,
        key=lambda e: (e.get("version", 0), e.get("created_at", "")),
        reverse=True,
    )
    return sorted_events[:max_items]


def calculate_acceptance_ratio(
    events: list[dict],
) -> tuple[int, int, float]:
    """
    Calculate accepted vs rejected count and ratio.

    Args:
        events: List of memory events with 'state' field

    Returns:
        Tuple of (accepted_count, rejected_count, acceptance_ratio)
    """
    accepted = sum(1 for e in events if e.get("state") == "accepted")
    rejected = sum(1 for e in events if e.get("state") == "rejected")
    total = accepted + rejected

    ratio = accepted / total if total > 0 else 0.0
    return accepted, rejected, ratio


def determine_continuity_signal(
    accepted_count: int,
    rejected_count: int,
) -> Literal["stable", "caution"]:
    """
    Determine continuity signal based on acceptance pattern.

    Logic:
    - "stable": accepted >= rejected (consistent with recommendations)
    - "caution": accepted < rejected (warnings or mixed signals)

    Args:
        accepted_count: Number of accepted recommendations
        rejected_count: Number of rejected recommendations

    Returns:
        Continuity signal ("stable" or "caution")
    """
    return "stable" if accepted_count >= rejected_count else "caution"


def get_memory_analytics(
    events: list[dict],
    max_items: int = 10,
) -> dict[str, any]:
    """
    Get comprehensive memory analytics.

    Includes recent events, counts, and continuity signal.

    Args:
        events: List of memory events
        max_items: Maximum events to include

    Returns:
        Dictionary with analytics including:
        - recent_events: Filtered events
        - accepted_count: Count of accepted
        - rejected_count: Count of rejected
        - continuity_signal: "stable" or "caution"
    """
    recent = filter_recent_events(events, max_items)
    accepted, rejected, _ratio = calculate_acceptance_ratio(recent)
    signal = determine_continuity_signal(accepted, rejected)

    return {
        "recent_events": recent,
        "accepted_count": accepted,
        "rejected_count": rejected,
        "continuity_signal": signal,
    }
