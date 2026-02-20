"""
Agent: Strategist

Generate optimization strategy for menu based on current state and goals.

Pure function (no frameworks). Used by apps/agents/strategist.py.
"""

from typing import Literal


Confidence = Literal["high", "medium", "low"]
Readiness = Literal["ready", "degraded", "blocked"]
OfferType = Literal["combo_offer", "happy_hour", "hero_item"]
Daypart = Literal["morning", "lunch", "afternoon", "evening"]


def filter_priority_suggestions(
    suggestions: list,
    max_items: int = 7,
) -> list:
    """
    Filter and rank suggestions for weekly priorities.

    Takes a list of suggestions (dicts or objects) and returns top N items by rank.
    Deterministic priority filtering based on rank ordering.

    Args:
        suggestions: List of suggestion dictionaries or objects with 'rank' field
        max_items: Maximum number of items to return (default: 7)

    Returns:
        List of top N suggestions, sorted by rank
    """
    if not suggestions:
        return []

    # Filter and sort by rank
    sorted_suggestions = sorted(
        suggestions,
        key=lambda x: (
            x.get("rank", float("inf"))
            if isinstance(x, dict)
            else getattr(x, "rank", float("inf"))
        ),
    )
    return sorted_suggestions[:max_items]


def determine_plan_status(
    priorities_count: int,
    readiness: Readiness = "ready",
) -> tuple[str, str]:
    """
    Determine plan status and reason code.

    Args:
        priorities_count: Number of priority suggestions
        readiness: Data readiness state (ready/degraded/blocked)

    Returns:
        Tuple of (status, reason_code)
    """
    if readiness == "blocked":
        return "blocked", "DATA_READINESS_BLOCKED"

    if readiness == "degraded":
        return "degraded", "DATA_READINESS_DEGRADED"

    if priorities_count == 0:
        return "degraded", "NO_ACTIONABLE_SUGGESTIONS"

    return "accepted", "ALLOWED"


def generate_default_headline(priorities_count: int) -> str:
    """
    Generate default headline based on priorities.

    Args:
        priorities_count: Number of priorities generated

    Returns:
        Default headline text
    """
    if priorities_count > 0:
        return "Weekly Instagram growth plan generated."
    else:
        return "No actionable suggestions were found for this week."


def build_scheduler_handoff(
    priorities: list[dict],
) -> dict[str, list]:
    """
    Build scheduler handoff recommendations from priorities.

    Transforms priority items to scheduler format.

    Args:
        priorities: List of priority items

    Returns:
        Dictionary with recommendations list for handoff
    """
    recommendations = []
    for item in priorities:
        recommendations.append(
            {
                "menu_item": item.get("menu_item"),
                "daypart": item.get("suggested_daypart"),
                "offer_type": item.get("offer_type"),
                "confidence": item.get("confidence"),
                "rationale": item.get("rationale"),
            }
        )
    return {"recommendations": recommendations}
