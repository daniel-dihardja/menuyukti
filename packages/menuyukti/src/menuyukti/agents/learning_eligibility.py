"""
Agent: Learning Eligibility

Determine if events are eligible for learning/optimization based on outcome confidence
and statistical significance thresholds.

Pure function (no frameworks). Used by apps/agents/learning.py.
"""

from typing import Literal

SignalType = Literal[
    "recommendation_issued",
    "user_decision",
    "execution_status",
    "outcome_delta",
]

Confidence = Literal["high", "medium", "low", "blocked"]


def evaluate_learning_event_eligibility(
    linkage_key: str,
    signal_type: SignalType,
    outcome_delta_revenue: float | None = None,
    outcome_confidence: Confidence | None = None,
    sample_size: int | None = None,
    min_sample_size: int = 7,
    min_abs_delta_revenue: float = 25.0,
) -> dict:
    """
    Evaluate if a single learning event meets eligibility criteria.

    An event is eligible for learning if:
    1. Signal type is "outcome_delta" (actual measured outcome)
    2. Outcome confidence is "high" or "medium"
    3. Sample size meets minimum threshold
    4. Absolute revenue delta meets minimum threshold

    Args:
        linkage_key: Unique identifier for this event/recommendation
        signal_type: Type of signal (recommendation/decision/execution/outcome)
        outcome_delta_revenue: Change in revenue from this event
        outcome_confidence: Confidence level (high/medium/low/blocked)
        sample_size: Number of data points supporting this outcome
        min_sample_size: Minimum required sample size (default: 7)
        min_abs_delta_revenue: Minimum absolute revenue change (default: 25)

    Returns:
        Dict with eligibility status and reasons for ineligibility:
            - linkage_key: The event key
            - signal_type: The signal type
            - eligible: Boolean eligibility
            - reasons: List of ineligibility reasons (empty if eligible)
    """
    reasons: list[str] = []
    eligible = True

    # Check signal type first - only outcome_delta signals are for learning
    if signal_type != "outcome_delta":
        eligible = False
        reasons.append("signal_not_outcome")
    else:
        # Check outcome confidence - must be high or medium
        if outcome_confidence in {None, "low", "blocked"}:
            eligible = False
            reasons.append("outcome_confidence_too_low")

        # Check sample size - need enough data points
        sample = sample_size or 0
        if sample < min_sample_size:
            eligible = False
            reasons.append("sample_size_below_minimum")

        # Check outcome magnitude - need meaningful change
        abs_delta = abs(outcome_delta_revenue or 0)
        if abs_delta < min_abs_delta_revenue:
            eligible = False
            reasons.append("outcome_delta_too_small")

    return {
        "linkage_key": linkage_key,
        "signal_type": signal_type,
        "eligible": eligible,
        "reasons": reasons,
    }


def evaluate_learning_events(
    events: list[dict],
    min_sample_size: int = 7,
    min_abs_delta_revenue: float = 25.0,
) -> list[dict]:
    """
    Evaluate batch of learning events for eligibility.

    Args:
        events: List of event dicts with fields:
            - linkage_key (str): Unique event identifier
            - signal_type (SignalType): Type of signal
            - outcome_delta_revenue (float, optional): Revenue change
            - outcome_confidence (Confidence, optional): Confidence level
            - sample_size (int, optional): Number of data points
        min_sample_size: Minimum required sample size
        min_abs_delta_revenue: Minimum absolute revenue change

    Returns:
        List of eligibility determinations
    """
    result = []

    for event in events:
        eligibility = evaluate_learning_event_eligibility(
            linkage_key=event.get("linkage_key", ""),
            signal_type=event.get("signal_type", "recommendation_issued"),
            outcome_delta_revenue=event.get("outcome_delta_revenue"),
            outcome_confidence=event.get("outcome_confidence"),
            sample_size=event.get("sample_size"),
            min_sample_size=min_sample_size,
            min_abs_delta_revenue=min_abs_delta_revenue,
        )
        result.append(eligibility)

    return result


def get_eligible_events(eligibility_results: list[dict]) -> list[dict]:
    """
    Filter eligibility results to only eligible events.

    Args:
        eligibility_results: Results from evaluate_learning_events()

    Returns:
        List of eligible events only
    """
    return [e for e in eligibility_results if e.get("eligible", False)]


def get_ineligible_events(eligibility_results: list[dict]) -> list[dict]:
    """
    Filter eligibility results to only ineligible events.

    Args:
        eligibility_results: Results from evaluate_learning_events()

    Returns:
        List of ineligible events with reasons
    """
    return [e for e in eligibility_results if not e.get("eligible", False)]
