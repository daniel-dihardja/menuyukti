"""
Tests for menuyukti.agents.learning_eligibility - event eligibility determination.
"""

import pytest

from menuyukti.agents.learning_eligibility import (
    evaluate_learning_event_eligibility,
    evaluate_learning_events,
    get_eligible_events,
    get_ineligible_events,
)


class TestEvaluateLearningEventEligibility:
    """Test single event eligibility determination."""

    def test_eligible_high_confidence_high_delta(self):
        """High confidence outcome with significant delta should be eligible."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=100.0,
            outcome_confidence="high",
            sample_size=10,
            min_sample_size=7,
            min_abs_delta_revenue=25.0,
        )

        assert result["eligible"] is True
        assert result["reasons"] == []
        assert result["linkage_key"] == "event_1"
        assert result["signal_type"] == "outcome_delta"

    def test_eligible_medium_confidence(self):
        """Medium confidence is acceptable."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=100.0,
            outcome_confidence="medium",
            sample_size=10,
        )

        assert result["eligible"] is True
        assert result["reasons"] == []

    def test_ineligible_wrong_signal_type(self):
        """Non-outcome signal types are not eligible."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="recommendation_issued",
            outcome_delta_revenue=100.0,
            outcome_confidence="high",
            sample_size=10,
        )

        assert result["eligible"] is False
        assert "signal_not_outcome" in result["reasons"]

    def test_ineligible_low_confidence(self):
        """Low confidence outcomes are not eligible."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=100.0,
            outcome_confidence="low",
            sample_size=10,
        )

        assert result["eligible"] is False
        assert "outcome_confidence_too_low" in result["reasons"]

    def test_ineligible_blocked_confidence(self):
        """Blocked confidence is treated as ineligible."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=100.0,
            outcome_confidence="blocked",
            sample_size=10,
        )

        assert result["eligible"] is False
        assert "outcome_confidence_too_low" in result["reasons"]

    def test_ineligible_none_confidence(self):
        """Missing confidence is treated as ineligible."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=100.0,
            outcome_confidence=None,
            sample_size=10,
        )

        assert result["eligible"] is False
        assert "outcome_confidence_too_low" in result["reasons"]

    def test_ineligible_insufficient_sample_size(self):
        """Sample size below minimum should be ineligible."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=100.0,
            outcome_confidence="high",
            sample_size=3,
            min_sample_size=7,
        )

        assert result["eligible"] is False
        assert "sample_size_below_minimum" in result["reasons"]

    def test_ineligible_zero_sample_size(self):
        """Zero sample size is insufficient."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=100.0,
            outcome_confidence="high",
            sample_size=0,
        )

        assert result["eligible"] is False
        assert "sample_size_below_minimum" in result["reasons"]

    def test_ineligible_none_sample_size_treated_as_zero(self):
        """None sample size is treated as 0."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=100.0,
            outcome_confidence="high",
            sample_size=None,
        )

        assert result["eligible"] is False
        assert "sample_size_below_minimum" in result["reasons"]

    def test_ineligible_delta_too_small(self):
        """Revenue delta below minimum threshold."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=10.0,
            outcome_confidence="high",
            sample_size=10,
            min_abs_delta_revenue=25.0,
        )

        assert result["eligible"] is False
        assert "outcome_delta_too_small" in result["reasons"]

    def test_eligible_negative_delta_with_high_absolute_value(self):
        """Negative delta is acceptable if absolute value is large."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=-100.0,
            outcome_confidence="high",
            sample_size=10,
            min_abs_delta_revenue=25.0,
        )

        assert result["eligible"] is True
        assert result["reasons"] == []

    def test_multiple_reasons_for_ineligibility(self):
        """Multiple violations should all be reported when signal type is correct."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",  # Correct type
            outcome_delta_revenue=10.0,  # Too small
            outcome_confidence="low",  # Too low
            sample_size=2,  # Too small
        )

        assert result["eligible"] is False
        assert len(result["reasons"]) > 1
        assert "sample_size_below_minimum" in result["reasons"]
        assert "outcome_delta_too_small" in result["reasons"]

    def test_eligible_exactly_at_thresholds(self):
        """Events exactly at threshold values should be eligible."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=25.0,  # Exactly at minimum
            outcome_confidence="medium",  # Acceptable
            sample_size=7,  # Exactly at minimum
        )

        assert result["eligible"] is True
        assert result["reasons"] == []

    def test_custom_thresholds(self):
        """Custom thresholds should be respected."""
        result = evaluate_learning_event_eligibility(
            linkage_key="event_1",
            signal_type="outcome_delta",
            outcome_delta_revenue=50.0,
            outcome_confidence="high",
            sample_size=5,
            min_sample_size=10,  # Stricter
            min_abs_delta_revenue=100.0,  # Stricter
        )

        assert result["eligible"] is False
        assert "sample_size_below_minimum" in result["reasons"]
        assert "outcome_delta_too_small" in result["reasons"]


class TestEvaluateLearningEvents:
    """Test batch event evaluation."""

    def test_empty_events_list(self):
        """Empty event list should return empty results."""
        result = evaluate_learning_events(events=[])
        assert result == []

    def test_single_eligible_event(self):
        """Single eligible event in batch."""
        events = [
            {
                "linkage_key": "event_1",
                "signal_type": "outcome_delta",
                "outcome_delta_revenue": 100.0,
                "outcome_confidence": "high",
                "sample_size": 10,
            }
        ]

        result = evaluate_learning_events(events)

        assert len(result) == 1
        assert result[0]["eligible"] is True

    def test_mixed_eligible_ineligible_events(self):
        """Batch with both eligible and ineligible events."""
        events = [
            {
                "linkage_key": "event_1",
                "signal_type": "outcome_delta",
                "outcome_delta_revenue": 100.0,
                "outcome_confidence": "high",
                "sample_size": 10,
            },
            {
                "linkage_key": "event_2",
                "signal_type": "recommendation_issued",  # Ineligible
                "outcome_delta_revenue": 100.0,
                "outcome_confidence": "high",
                "sample_size": 10,
            },
            {
                "linkage_key": "event_3",
                "signal_type": "outcome_delta",
                "outcome_delta_revenue": 100.0,
                "outcome_confidence": "high",
                "sample_size": 10,
            },
        ]

        result = evaluate_learning_events(events)

        assert len(result) == 3
        assert result[0]["eligible"] is True
        assert result[1]["eligible"] is False
        assert result[2]["eligible"] is True

    def test_batch_with_custom_thresholds(self):
        """Batch evaluation respects custom thresholds."""
        events = [
            {
                "linkage_key": "event_1",
                "signal_type": "outcome_delta",
                "outcome_delta_revenue": 50.0,
                "outcome_confidence": "high",
                "sample_size": 5,
            },
            {
                "linkage_key": "event_2",
                "signal_type": "outcome_delta",
                "outcome_delta_revenue": 200.0,
                "outcome_confidence": "high",
                "sample_size": 15,
            },
        ]

        # Strict thresholds
        result = evaluate_learning_events(
            events,
            min_sample_size=10,
            min_abs_delta_revenue=100.0,
        )

        assert result[0]["eligible"] is False
        assert result[1]["eligible"] is True

    def test_handles_missing_optional_fields(self):
        """Events with missing optional fields handled gracefully."""
        events = [
            {
                "linkage_key": "event_1",
                "signal_type": "outcome_delta",
                # Missing: outcome_delta_revenue, outcome_confidence, sample_size
            }
        ]

        result = evaluate_learning_events(events)

        assert len(result) == 1
        assert result[0]["eligible"] is False


class TestGetEligibleEvents:
    """Test filtering eligible events."""

    def test_get_eligible_events_from_mixed_batch(self):
        """Extract only eligible events."""
        eligibility_results = [
            {"linkage_key": "event_1", "eligible": True, "reasons": []},
            {"linkage_key": "event_2", "eligible": False, "reasons": ["reason_1"]},
            {"linkage_key": "event_3", "eligible": True, "reasons": []},
        ]

        eligible = get_eligible_events(eligibility_results)

        assert len(eligible) == 2
        assert eligible[0]["linkage_key"] == "event_1"
        assert eligible[1]["linkage_key"] == "event_3"

    def test_get_eligible_events_empty_list(self):
        """Empty list of results."""
        eligible = get_eligible_events([])
        assert eligible == []

    def test_get_eligible_events_all_ineligible(self):
        """When all events ineligible."""
        eligibility_results = [
            {"linkage_key": "event_1", "eligible": False, "reasons": ["reason_1"]},
            {"linkage_key": "event_2", "eligible": False, "reasons": ["reason_2"]},
        ]

        eligible = get_eligible_events(eligibility_results)
        assert eligible == []


class TestGetIneligibleEvents:
    """Test filtering ineligible events."""

    def test_get_ineligible_events_from_mixed_batch(self):
        """Extract only ineligible events with reasons."""
        eligibility_results = [
            {"linkage_key": "event_1", "eligible": True, "reasons": []},
            {
                "linkage_key": "event_2",
                "eligible": False,
                "reasons": ["sample_size_too_small"],
            },
            {
                "linkage_key": "event_3",
                "eligible": False,
                "reasons": ["delta_too_small"],
            },
        ]

        ineligible = get_ineligible_events(eligibility_results)

        assert len(ineligible) == 2
        assert ineligible[0]["linkage_key"] == "event_2"
        assert ineligible[1]["linkage_key"] == "event_3"

    def test_get_ineligible_events_empty_list(self):
        """Empty list of results."""
        ineligible = get_ineligible_events([])
        assert ineligible == []

    def test_get_ineligible_events_all_eligible(self):
        """When all events eligible."""
        eligibility_results = [
            {"linkage_key": "event_1", "eligible": True, "reasons": []},
            {"linkage_key": "event_2", "eligible": True, "reasons": []},
        ]

        ineligible = get_ineligible_events(eligibility_results)
        assert ineligible == []
