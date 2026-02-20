"""
Agent: Feedback Reranking

Re-rank baseline recommendations based on historical feedback signals.

Pure function (no frameworks). Used by apps/agents/rerank.py.
"""

from typing import Literal


def _calculate_feedback_boost(
    prior: dict,
    sample_size_threshold: int = 3,
) -> float:
    """
    Calculate feedback boost for a recommendation based on historical performance.

    Args:
        prior: Feedback prior dict with fields:
            - sample_size (int): Number of feedback data points
            - success_rate (float): Fraction successful (0-1)
            - avg_delta_revenue (float): Average revenue impact
        sample_size_threshold: Minimum samples needed to apply boost

    Returns:
        Feedback boost score to add to baseline score
    """
    if prior.get("sample_size", 0) < 1:
        return 0.0

    sample_size = prior.get("sample_size", 0)
    success_rate = prior.get("success_rate", 0.5)
    avg_delta_revenue = prior.get("avg_delta_revenue", 0.0)

    # Success impact (50% - 0.5 moves score by ±0.3)
    success_component = (success_rate - 0.5) * 0.6

    # Sample size impact (more samples = more confidence, capped at 0.075)
    sample_component = min(0.3, sample_size / 100) * 0.25

    # Revenue impact (normalize by 1000, cap at ±0.25)
    revenue_factor = max(-0.25, min(0.25, avg_delta_revenue / 1000))

    return success_component + sample_component + revenue_factor


def rerank_by_feedback(
    baseline: list[dict],
    priors: list[dict] | None = None,
    min_signal_count: int = 3,
) -> list[dict]:
    """
    Re-rank baseline recommendations using feedback priors.

    Args:
        baseline: List of baseline recommendations with fields:
            - recommendation_id (str): Unique identifier
            - menu_item (str): Item name/ID
            - action (str): promote/improve/bundle/deprioritize
            - rank (int): Original rank
            - baseline_score (float): Original score
        priors: List of feedback priors (optional) with fields:
            - recommendation_id (str): Matches recommendation ID
            - sample_size (int): Number of feedback samples
            - success_rate (float): Success rate (0-1)
            - avg_delta_revenue (float): Average revenue delta
        min_signal_count: Minimum signal count to apply reranking
            (if less, falls back to baseline)

    Returns:
        List of re-ranked recommendations with scores and explanations
    """
    if not baseline:
        return []

    priors = priors or []
    priors_by_id = {p.get("recommendation_id"): p for p in priors}

    # Check if we have enough feedback signals
    eligible_signals = [p for p in priors if p.get("sample_size", 0) >= 1]
    fallback = len(eligible_signals) < min_signal_count

    # Score each recommendation
    scored = []
    for item in baseline:
        recommendation_id = item.get("recommendation_id", "")
        prior = priors_by_id.get(recommendation_id)

        if fallback:
            # Not enough signals - use baseline score
            final_score = item.get("baseline_score", 0.0)
            feedback_boost = 0.0
        else:
            # Apply feedback boost if prior exists
            feedback_boost = (
                _calculate_feedback_boost(prior, sample_size_threshold=1)
                if prior
                else 0.0
            )
            final_score = max(0.0, item.get("baseline_score", 0.0) + feedback_boost)

        scored.append(
            {
                "recommendation_id": recommendation_id,
                "menu_item": item.get("menu_item", ""),
                "action": item.get("action", "improve"),
                "baseline_rank": item.get("rank", 0),
                "baseline_score": round(item.get("baseline_score", 0.0), 4),
                "feedback_boost": round(feedback_boost, 4),
                "final_score": round(final_score, 4),
                "prior": prior if prior else None,
            }
        )

    # Sort by final score (descending)
    ranked = sorted(scored, key=lambda row: row["final_score"], reverse=True)

    # Add final rankings and deltas
    recommendations = []
    for index, row in enumerate(ranked, start=1):
        recommendations.append(
            {
                **row,
                "final_rank": index,
                "rank_delta": row["baseline_rank"] - index,
                "explainability": {
                    "fallback_to_baseline": fallback,
                    "explanation": (
                        "fallback_to_baseline_due_to_weak_signals"
                        if fallback
                        else "score = baseline + feedback_boost"
                    ),
                },
            }
        )

    return recommendations


def get_top_recommendation(recommendations: list[dict]) -> dict | None:
    """
    Get top-ranked recommendation.

    Args:
        recommendations: Results from rerank_by_feedback()

    Returns:
        Top recommendation or None if empty
    """
    return recommendations[0] if recommendations else None


def get_rank_changes(recommendations: list[dict]) -> dict:
    """
    Analyze rank changes from baseline to reranked.

    Args:
        recommendations: Results from rerank_by_feedback()

    Returns:
        Dict with statistics about rank movements:
            - promoted: Count of items that moved up
            - demoted: Count of items that moved down
            - stable: Count of items with same rank
            - max_promotion: Largest rank improvement
            - max_demotion: Largest rank decline
    """
    if not recommendations:
        return {
            "promoted": 0,
            "demoted": 0,
            "stable": 0,
            "max_promotion": 0,
            "max_demotion": 0,
        }

    promoted = sum(1 for r in recommendations if r.get("rank_delta", 0) > 0)
    demoted = sum(1 for r in recommendations if r.get("rank_delta", 0) < 0)
    stable = sum(1 for r in recommendations if r.get("rank_delta", 0) == 0)

    deltas = [r.get("rank_delta", 0) for r in recommendations]
    max_promotion = max(deltas) if deltas else 0
    max_demotion = min(deltas) if deltas else 0

    return {
        "promoted": promoted,
        "demoted": demoted,
        "stable": stable,
        "max_promotion": max_promotion,
        "max_demotion": max_demotion,
    }
