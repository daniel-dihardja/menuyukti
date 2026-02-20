"""
Agent: Consensus Ranking

Rank menu candidates based on consensus scoring across multiple indicators.

Pure function (no frameworks). Used by apps/agents/consensus.py for signal generation.
"""

from typing import Literal

Mode = Literal["conservative", "aggressive"]
Confidence = Literal["high", "medium", "low", "blocked"]
Action = Literal["promote", "improve", "bundle", "deprioritize"]


def _strategy_score(
    expected_revenue_delta: float,
    expected_margin_delta: float,
    confidence: Confidence,
    mode: Mode,
) -> float:
    """
    Calculate strategy score from expected deltas and confidence.

    Args:
        expected_revenue_delta: Expected change in revenue
        expected_margin_delta: Expected change in margin
        confidence: Confidence level (high/medium/low/blocked)
        mode: conservative or aggressive scoring mode

    Returns:
        Strategy score (float)
    """
    growth = max(0.0, expected_revenue_delta) * (1.15 if mode == "aggressive" else 0.95)
    margin = max(0.0, expected_margin_delta) * (0.9 if mode == "aggressive" else 1.1)
    confidence_multiplier = (
        1.0 if confidence == "high" else 0.7 if confidence == "medium" else 0.45
    )
    return growth + margin + confidence_multiplier


def _risk_penalty(
    risk_flags: list[str],
    confidence: Confidence,
    mode: Mode,
) -> float:
    """
    Calculate risk penalty based on flags and confidence.

    Args:
        risk_flags: List of risk flag strings
        confidence: Confidence level (high/medium/low/blocked)
        mode: conservative or aggressive penalty mode

    Returns:
        Risk penalty (float, subtracted from score)
    """
    base = len(risk_flags) * (0.35 if mode == "aggressive" else 0.6)
    low_confidence = 0.8 if confidence == "low" else 0.0
    blocked = 10.0 if confidence == "blocked" else 0.0
    return base + low_confidence + blocked


def rank_consensus_candidates(
    candidates: list[dict],
    mode: Mode = "conservative",
    top_k: int = 8,
) -> list[dict]:
    """
    Rank menu candidates based on consensus scoring.

    Args:
        candidates: List of candidate dicts with fields:
            - menu_item (str): Item name/ID
            - action (Action): promote/improve/bundle/deprioritize
            - confidence (Confidence): high/medium/low/blocked
            - expected_revenue_delta (float): Expected revenue change
            - expected_margin_delta (float): Expected margin change
            - risk_flags (list[str]): Risk flags for this candidate
        mode: "conservative" (default) or "aggressive" scoring
        top_k: Maximum number of recommendations to return

    Returns:
        List of ranked recommendations with scores:
            - rank: 1-indexed rank
            - menu_item: Item name/ID
            - action: Recommended action
            - confidence: Confidence level
            - consensus_score: Final score after risk penalty
            - strategy_score: Strategy component
            - risk_penalty: Risk component (penalty)
            - expected_revenue_delta: Revenue impact (≥0)
            - expected_margin_delta: Margin impact (≥0)
            - risk_flags: Associated risks
    """
    if not candidates:
        return []

    # Score each candidate
    scored = []
    for candidate in candidates:
        strategy = _strategy_score(
            expected_revenue_delta=candidate.get("expected_revenue_delta", 0),
            expected_margin_delta=candidate.get("expected_margin_delta", 0),
            confidence=candidate.get("confidence", "medium"),
            mode=mode,
        )
        risk = _risk_penalty(
            risk_flags=candidate.get("risk_flags", []),
            confidence=candidate.get("confidence", "medium"),
            mode=mode,
        )
        final_score = strategy - risk

        scored.append(
            {
                "candidate": candidate,
                "strategy_score": round(strategy, 4),
                "risk_penalty": round(risk, 4),
                "consensus_score": round(final_score, 4),
            }
        )

    # Rank by consensus score (highest first)
    ranked = sorted(scored, key=lambda row: row["consensus_score"], reverse=True)

    # Format recommendations
    recommendations = []
    for idx, row in enumerate(ranked[:top_k]):
        candidate = row["candidate"]
        recommendations.append(
            {
                "rank": idx + 1,
                "menu_item": candidate.get("menu_item", ""),
                "action": candidate.get("action", "improve"),
                "confidence": candidate.get("confidence", "medium"),
                "expected_revenue_delta": round(
                    max(0.0, candidate.get("expected_revenue_delta", 0)), 2
                ),
                "expected_margin_delta": round(
                    max(0.0, candidate.get("expected_margin_delta", 0)), 2
                ),
                "consensus_score": row["consensus_score"],
                "strategy_score": row["strategy_score"],
                "risk_penalty": row["risk_penalty"],
                "risk_flags": candidate.get("risk_flags", []),
            }
        )

    return recommendations


def get_consensus_winner(recommendations: list[dict]) -> dict | None:
    """
    Get the top recommendation (winner) from ranked list.

    Args:
        recommendations: Ranked recommendations from rank_consensus_candidates()

    Returns:
        Top recommendation or None if no recommendations
    """
    return recommendations[0] if recommendations else None


def get_disagreement_reasons(recommendations: list[dict]) -> list[str]:
    """
    Generate disagreement reasons from recommendations.

    Args:
        recommendations: Ranked recommendations from rank_consensus_candidates()

    Returns:
        List of disagreement reason codes
    """
    reasons: list[str] = []

    for rec in recommendations:
        if rec.get("risk_flags"):
            reasons.append(f"risk:{rec['menu_item']}")
        if rec.get("confidence") in {"low", "blocked"}:
            reasons.append(f"confidence:{rec['menu_item']}")

    if not reasons and recommendations:
        reasons.append("strategy_and_risk_aligned")

    return reasons
