"""
Tests for menuyukti.agents.rerank - feedback-based recommendation reranking.
"""

import pytest

from menuyukti.orchestration.rerank import (
    rerank_by_feedback,
    get_top_recommendation,
    get_rank_changes,
    _calculate_feedback_boost,
)


class TestCalculateFeedbackBoost:
    """Test feedback boost calculation."""

    def test_no_samples_no_boost(self):
        """Zero samples gives zero boost."""
        prior = {"sample_size": 0}
        assert _calculate_feedback_boost(prior) == 0.0

    def test_perfect_success_positive_boost(self):
        """100% success rate gives positive boost."""
        prior = {
            "sample_size": 10,
            "success_rate": 1.0,
            "avg_delta_revenue": 0.0,
        }
        boost = _calculate_feedback_boost(prior)
        # (1.0 - 0.5) * 0.6 + min(0.3, 10/100) * 0.25 + 0 = 0.3 + 0.025 = 0.325
        assert boost == pytest.approx(0.325, rel=0.01)

    def test_poor_success_negative_boost(self):
        """Low success rate gives negative boost."""
        prior = {
            "sample_size": 10,
            "success_rate": 0.2,
            "avg_delta_revenue": 0.0,
        }
        boost = _calculate_feedback_boost(prior)
        # (0.2 - 0.5) * 0.6 = -0.18
        assert boost < 0.0

    def test_large_sample_size_boost_capped(self):
        """Large sample size boost is capped at 0.075."""
        prior = {
            "sample_size": 1000,  # Would be 3.0, but capped at 0.3
            "success_rate": 0.5,
            "avg_delta_revenue": 0.0,
        }
        boost = _calculate_feedback_boost(prior)
        # min(0.3, 1000/100) * 0.25 = 0.3 * 0.25 = 0.075
        assert boost == pytest.approx(0.075, rel=0.01)

    def test_revenue_delta_positive_boost(self):
        """Positive revenue delta adds boost."""
        prior = {
            "sample_size": 10,
            "success_rate": 0.5,
            "avg_delta_revenue": 500.0,  # +500
        }
        boost = _calculate_feedback_boost(prior)
        # max(-0.25, min(0.25, 500/1000)) = 0.25
        # Total: 0 + 0.025 + 0.25 = 0.275
        assert boost == pytest.approx(0.275, rel=0.01)

    def test_revenue_delta_capped_at_0_25(self):
        """Revenue impact capped at ±0.25."""
        prior = {
            "sample_size": 10,
            "success_rate": 0.5,
            "avg_delta_revenue": 5000.0,  # Very high
        }
        boost = _calculate_feedback_boost(prior)
        # max(-0.25, min(0.25, 5000/1000)) = 0.25
        # Total: 0 + 0.025 + 0.25 = 0.275
        assert boost == pytest.approx(0.275, rel=0.01)


class TestRerankByFeedback:
    """Test feedback-based reranking."""

    def test_empty_baseline(self):
        """Empty baseline returns empty recommendations."""
        result = rerank_by_feedback([])
        assert result == []

    def test_single_recommendation_no_feedback(self):
        """Single recommendation with no feedback keeps baseline score."""
        baseline = [
            {
                "recommendation_id": "rec_1",
                "menu_item": "burger",
                "action": "promote",
                "rank": 1,
                "baseline_score": 0.85,
            }
        ]

        result = rerank_by_feedback(baseline, priors=[])

        assert len(result) == 1
        assert result[0]["recommendation_id"] == "rec_1"
        assert result[0]["final_rank"] == 1
        assert result[0]["rank_delta"] == 0

    def test_fallback_when_insufficient_signals(self):
        """Insufficient signals (< min_signal_count) falls back to baseline."""
        baseline = [
            {
                "recommendation_id": "rec_1",
                "menu_item": "item_1",
                "action": "promote",
                "rank": 1,
                "baseline_score": 0.70,
            },
            {
                "recommendation_id": "rec_2",
                "menu_item": "item_2",
                "action": "improve",
                "rank": 2,
                "baseline_score": 0.75,
            },
        ]

        priors = [
            {
                "recommendation_id": "rec_1",
                "sample_size": 1,
                "success_rate": 1.0,
                "avg_delta_revenue": 500.0,
            }
        ]

        result = rerank_by_feedback(baseline, priors=priors, min_signal_count=3)

        # Fallback to baseline (not enough signals)
        assert result[0]["final_score"] == 0.75  # rec_2 baseline score (higher)
        assert result[0]["recommendation_id"] == "rec_2"

    def test_rerank_with_sufficient_feedback(self):
        """Sufficient feedback signals enable reranking."""
        baseline = [
            {
                "recommendation_id": "rec_1",
                "menu_item": "item_1",
                "action": "promote",
                "rank": 1,
                "baseline_score": 0.70,
            },
            {
                "recommendation_id": "rec_2",
                "menu_item": "item_2",
                "action": "improve",
                "rank": 2,
                "baseline_score": 0.75,
            },
            {
                "recommendation_id": "rec_3",
                "menu_item": "item_3",
                "action": "bundle",
                "rank": 3,
                "baseline_score": 0.60,
            },
        ]

        priors = [
            {
                "recommendation_id": "rec_1",
                "sample_size": 10,
                "success_rate": 0.9,
                "avg_delta_revenue": 300.0,
            },
            {
                "recommendation_id": "rec_2",
                "sample_size": 5,
                "success_rate": 0.4,
                "avg_delta_revenue": -100.0,
            },
            {
                "recommendation_id": "rec_3",
                "sample_size": 8,
                "success_rate": 1.0,
                "avg_delta_revenue": 500.0,
            },
        ]

        result = rerank_by_feedback(baseline, priors=priors, min_signal_count=2)

        # rec_1 and rec_3 should have positive boosts
        # rec_2 should have negative boost
        # Should be reranked based on final scores
        assert len(result) == 3
        assert result[0]["explainability"]["fallback_to_baseline"] is False

    def test_rank_delta_calculation(self):
        """Rank delta correctly calculated (baseline_rank - final_rank)."""
        baseline = [
            {
                "recommendation_id": "rec_1",
                "menu_item": "item_1",
                "action": "promote",
                "rank": 3,
                "baseline_score": 0.70,
            },
            {
                "recommendation_id": "rec_2",
                "menu_item": "item_2",
                "action": "improve",
                "rank": 1,
                "baseline_score": 0.50,
            },
        ]

        priors = [
            {
                "recommendation_id": "rec_1",
                "sample_size": 10,
                "success_rate": 0.1,  # Very poor
                "avg_delta_revenue": -500.0,
            },
            {
                "recommendation_id": "rec_2",
                "sample_size": 10,
                "success_rate": 1.0,  # Excellent
                "avg_delta_revenue": 500.0,
            },
        ]

        result = rerank_by_feedback(baseline, priors=priors, min_signal_count=2)

        # rec_2 should move from rank 1 to a better position (positive delta)
        # rec_1 should move from rank 3 to worse position (negative delta)
        # After reranking, rec_2 should be first
        assert result[0]["recommendation_id"] == "rec_2"
        assert result[0]["rank_delta"] == 1 - result[0]["final_rank"]

    def test_missing_priors_handled_gracefully(self):
        """Recommendations without priors handled gracefully."""
        baseline = [
            {
                "recommendation_id": "rec_1",
                "menu_item": "item_1",
                "action": "promote",
                "rank": 1,
                "baseline_score": 0.85,
            },
            {
                "recommendation_id": "rec_2",  # No prior
                "menu_item": "item_2",
                "action": "improve",
                "rank": 2,
                "baseline_score": 0.75,
            },
        ]

        priors = [
            {
                "recommendation_id": "rec_1",
                "sample_size": 10,
                "success_rate": 1.0,
                "avg_delta_revenue": 500.0,
            }
        ]

        result = rerank_by_feedback(baseline, priors=priors, min_signal_count=1)

        assert len(result) == 2
        # rec_2 should have no prior
        assert result[0]["prior"] is None or result[1]["prior"] is None


class TestGetTopRecommendation:
    """Test top recommendation extraction."""

    def test_top_recommendation_from_reranked(self):
        """Get top recommendation from reranked list."""
        recommendations = [
            {"recommendation_id": "rec_1", "final_rank": 1},
            {"recommendation_id": "rec_2", "final_rank": 2},
        ]

        top = get_top_recommendation(recommendations)

        assert top is not None
        assert top["recommendation_id"] == "rec_1"

    def test_no_top_recommendation_empty(self):
        """Empty list returns None."""
        top = get_top_recommendation([])
        assert top is None


class TestGetRankChanges:
    """Test rank change analysis."""

    def test_promoted_items_counted(self):
        """Count items that moved up in rank."""
        recommendations = [
            {"final_rank": 1, "baseline_rank": 3, "rank_delta": 2},  # promoted
            {"final_rank": 2, "baseline_rank": 2, "rank_delta": 0},  # stable
            {"final_rank": 3, "baseline_rank": 1, "rank_delta": -2},  # demoted
        ]

        changes = get_rank_changes(recommendations)

        assert changes["promoted"] == 1
        assert changes["demoted"] == 1
        assert changes["stable"] == 1
        assert changes["max_promotion"] == 2
        assert changes["max_demotion"] == -2

    def test_empty_recommendations(self):
        """Empty recommendations return zero changes."""
        changes = get_rank_changes([])

        assert changes["promoted"] == 0
        assert changes["demoted"] == 0
        assert changes["stable"] == 0
        assert changes["max_promotion"] == 0
        assert changes["max_demotion"] == 0

    def test_all_stable(self):
        """When no ranks change."""
        recommendations = [
            {"final_rank": 1, "baseline_rank": 1, "rank_delta": 0},
            {"final_rank": 2, "baseline_rank": 2, "rank_delta": 0},
            {"final_rank": 3, "baseline_rank": 3, "rank_delta": 0},
        ]

        changes = get_rank_changes(recommendations)

        assert changes["promoted"] == 0
        assert changes["demoted"] == 0
        assert changes["stable"] == 3
