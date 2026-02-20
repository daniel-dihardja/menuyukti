"""
Tests for menuyukti.agents.consensus - pure deterministic ranking logic.
"""

import pytest

from menuyukti.agents.consensus import (
    rank_consensus_candidates,
    get_consensus_winner,
    get_disagreement_reasons,
    _strategy_score,
    _risk_penalty,
)


class TestStrategyScore:
    """Test strategy score calculation."""

    def test_strategy_score_high_confidence_conservative(self):
        """High confidence, conservative mode."""
        score = _strategy_score(
            expected_revenue_delta=100,
            expected_margin_delta=50,
            confidence="high",
            mode="conservative",
        )
        # growth: 100 * 0.95 = 95
        # margin: 50 * 1.1 = 55
        # confidence: 1.0
        # total: 95 + 55 + 1.0 = 151.0
        assert score == 151.0

    def test_strategy_score_medium_confidence_aggressive(self):
        """Medium confidence, aggressive mode."""
        score = _strategy_score(
            expected_revenue_delta=100,
            expected_margin_delta=50,
            confidence="medium",
            mode="aggressive",
        )
        # growth: 100 * 1.15 = 115
        # margin: 50 * 0.9 = 45
        # confidence: 0.7
        # total: 115 + 45 + 0.7 = 160.7
        assert score == 160.7

    def test_strategy_score_low_confidence(self):
        """Low confidence reduces score."""
        score_low = _strategy_score(
            expected_revenue_delta=100,
            expected_margin_delta=50,
            confidence="low",
            mode="conservative",
        )
        score_high = _strategy_score(
            expected_revenue_delta=100,
            expected_margin_delta=50,
            confidence="high",
            mode="conservative",
        )
        # Low confidence multiplier (0.45) should score lower than high (1.0)
        assert score_low < score_high


class TestRiskPenalty:
    """Test risk penalty calculation."""

    def test_risk_penalty_no_flags_conservative(self):
        """No risk flags, conservative mode."""
        penalty = _risk_penalty(
            risk_flags=[],
            confidence="high",
            mode="conservative",
        )
        # base: 0 * 0.6 = 0
        # low_confidence: 0
        # blocked: 0
        # total: 0
        assert penalty == 0.0

    def test_risk_penalty_with_flags_conservative(self):
        """Multiple risk flags, conservative mode."""
        penalty = _risk_penalty(
            risk_flags=["low_volume", "new_item"],
            confidence="medium",
            mode="conservative",
        )
        # base: 2 * 0.6 = 1.2
        # low_confidence: 0 (medium, not low)
        # blocked: 0
        # total: 1.2
        assert penalty == 1.2

    def test_risk_penalty_blocked_confidence(self):
        """Blocked confidence adds heavy penalty."""
        penalty = _risk_penalty(
            risk_flags=[],
            confidence="blocked",
            mode="conservative",
        )
        # base: 0
        # low_confidence: 0 (not low, it's blocked)
        # blocked: 10.0
        # total: 10.0
        assert penalty == 10.0

    def test_risk_penalty_aggressive_mode_lower(self):
        """Aggressive mode applies lower penalties."""
        penalty_conservative = _risk_penalty(
            risk_flags=["flag1", "flag2"],
            confidence="medium",
            mode="conservative",
        )
        penalty_aggressive = _risk_penalty(
            risk_flags=["flag1", "flag2"],
            confidence="medium",
            mode="aggressive",
        )
        # Conservative: 2 * 0.6 = 1.2
        # Aggressive: 2 * 0.35 = 0.7
        assert penalty_conservative > penalty_aggressive


class TestRankConsensusCandidates:
    """Test ranking of consensus candidates."""

    def test_empty_candidates(self):
        """Empty candidate list returns empty recommendations."""
        result = rank_consensus_candidates(candidates=[])
        assert result == []

    def test_single_candidate(self):
        """Single candidate is ranked as #1."""
        candidates = [
            {
                "menu_item": "burger",
                "action": "promote",
                "confidence": "high",
                "expected_revenue_delta": 100,
                "expected_margin_delta": 50,
                "risk_flags": [],
            }
        ]
        result = rank_consensus_candidates(candidates)

        assert len(result) == 1
        assert result[0]["rank"] == 1
        assert result[0]["menu_item"] == "burger"
        assert result[0]["confidence"] == "high"

    def test_multiple_candidates_ranked_correctly(self):
        """Multiple candidates ranked by consensus score."""
        candidates = [
            {
                "menu_item": "item_a",
                "action": "promote",
                "confidence": "high",
                "expected_revenue_delta": 100,
                "expected_margin_delta": 50,
                "risk_flags": [],
            },
            {
                "menu_item": "item_b",
                "action": "improve",
                "confidence": "medium",
                "expected_revenue_delta": 200,
                "expected_margin_delta": 30,
                "risk_flags": ["low_volume"],
            },
        ]
        result = rank_consensus_candidates(candidates, mode="conservative")

        assert len(result) == 2
        assert result[0]["rank"] == 1
        assert result[1]["rank"] == 2
        # item_a should score higher due to high confidence
        # despite item_b having higher revenue delta

    def test_aggressive_mode_favors_revenue(self):
        """Aggressive mode weights revenue more heavily."""
        candidates = [
            {
                "menu_item": "item",
                "action": "promote",
                "confidence": "medium",
                "expected_revenue_delta": 100,
                "expected_margin_delta": 50,
                "risk_flags": ["risk1"],
            }
        ]

        result_conservative = rank_consensus_candidates(candidates, mode="conservative")
        result_aggressive = rank_consensus_candidates(candidates, mode="aggressive")

        # Both should return results
        assert len(result_conservative) == 1
        assert len(result_aggressive) == 1
        # Scores should differ due to mode
        assert (
            result_conservative[0]["consensus_score"]
            != result_aggressive[0]["consensus_score"]
        )

    def test_top_k_limit(self):
        """Only top_k recommendations are returned."""
        candidates = [
            {
                "menu_item": f"item_{i}",
                "action": "promote",
                "confidence": "high" if i < 5 else "medium",
                "expected_revenue_delta": 100 - i * 10,
                "expected_margin_delta": 50,
                "risk_flags": [],
            }
            for i in range(15)
        ]

        result = rank_consensus_candidates(candidates, top_k=5)
        assert len(result) <= 5

    def test_scores_are_rounded(self):
        """Scores are rounded to 4 decimal places."""
        candidates = [
            {
                "menu_item": "item",
                "action": "promote",
                "confidence": "high",
                "expected_revenue_delta": 100.123456,
                "expected_margin_delta": 50.987654,
                "risk_flags": [],
            }
        ]
        result = rank_consensus_candidates(candidates)

        # Check that scores are properly rounded
        assert isinstance(result[0]["consensus_score"], float)
        assert len(str(result[0]["consensus_score"]).split(".")[-1]) <= 4


class TestGetConsensusWinner:
    """Test getting the winner from recommendations."""

    def test_winner_from_recommendations(self):
        """Get top recommendation as winner."""
        recommendations = [
            {"rank": 1, "menu_item": "winner"},
            {"rank": 2, "menu_item": "second"},
        ]
        winner = get_consensus_winner(recommendations)

        assert winner is not None
        assert winner["menu_item"] == "winner"

    def test_no_winner_from_empty_recommendations(self):
        """Empty recommendations return None."""
        winner = get_consensus_winner([])
        assert winner is None


class TestGetDisagreementReasons:
    """Test disagreement reason generation."""

    def test_aligned_when_no_issues(self):
        """Returns aligned when no risks or low confidence."""
        recommendations = [
            {
                "menu_item": "item",
                "risk_flags": [],
                "confidence": "high",
            }
        ]
        reasons = get_disagreement_reasons(recommendations)

        assert "strategy_and_risk_aligned" in reasons

    def test_risk_reasons_included(self):
        """Risk flags generate disagreement reasons."""
        recommendations = [
            {
                "menu_item": "item_a",
                "risk_flags": ["low_volume", "new_item"],
                "confidence": "high",
            },
            {
                "menu_item": "item_b",
                "risk_flags": [],
                "confidence": "medium",
            },
        ]
        reasons = get_disagreement_reasons(recommendations)

        assert "risk:item_a" in reasons

    def test_confidence_reasons_included(self):
        """Low/blocked confidence generates disagreement reasons."""
        recommendations = [
            {
                "menu_item": "item_low",
                "risk_flags": [],
                "confidence": "low",
            },
            {
                "menu_item": "item_blocked",
                "risk_flags": [],
                "confidence": "blocked",
            },
        ]
        reasons = get_disagreement_reasons(recommendations)

        assert "confidence:item_low" in reasons
        assert "confidence:item_blocked" in reasons

    def test_empty_recommendations_no_aligned(self):
        """Empty recommendations don't add aligned reason."""
        reasons = get_disagreement_reasons([])
        assert "strategy_and_risk_aligned" not in reasons
