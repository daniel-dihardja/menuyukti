"""
Unit tests for Strategist agent.

Tests priority filtering, status determination, headline generation, and scheduler handoff.
"""

import pytest

from menuyukti.orchestration.strategist import (
    filter_priority_suggestions,
    determine_plan_status,
    generate_default_headline,
    build_scheduler_handoff,
)


class TestFilterPrioritySuggestions:
    """Tests for filter_priority_suggestions function."""

    def test_filter_returns_top_n_items(self):
        """Should return top N items by rank."""
        suggestions = [
            {"rank": 3, "menu_item": "burger"},
            {"rank": 1, "menu_item": "pizza"},
            {"rank": 2, "menu_item": "pasta"},
            {"rank": 5, "menu_item": "salad"},
            {"rank": 4, "menu_item": "dessert"},
        ]
        result = filter_priority_suggestions(suggestions, max_items=3)
        assert len(result) == 3
        assert result[0]["menu_item"] == "pizza"  # rank 1
        assert result[1]["menu_item"] == "pasta"  # rank 2
        assert result[2]["menu_item"] == "burger"  # rank 3

    def test_filter_default_max_items_is_7(self):
        """Default max_items should be 7."""
        suggestions = [{"rank": i, "menu_item": f"item_{i}"} for i in range(1, 11)]
        result = filter_priority_suggestions(suggestions)
        assert len(result) == 7

    def test_filter_fewer_suggestions_than_max(self):
        """Should return all suggestions if fewer than max_items."""
        suggestions = [
            {"rank": 2, "menu_item": "item2"},
            {"rank": 1, "menu_item": "item1"},
        ]
        result = filter_priority_suggestions(suggestions, max_items=7)
        assert len(result) == 2

    def test_filter_empty_list(self):
        """Should return empty list for empty input."""
        result = filter_priority_suggestions([], max_items=7)
        assert result == []

    def test_filter_single_item(self):
        """Should handle single item correctly."""
        suggestions = [{"rank": 1, "menu_item": "only_item"}]
        result = filter_priority_suggestions(suggestions, max_items=7)
        assert len(result) == 1
        assert result[0]["menu_item"] == "only_item"

    def test_filter_unsorted_input_is_sorted(self):
        """Input order should not matter, output should be sorted by rank."""
        suggestions = [
            {"rank": 5, "menu_item": "last"},
            {"rank": 1, "menu_item": "first"},
            {"rank": 3, "menu_item": "middle"},
        ]
        result = filter_priority_suggestions(suggestions, max_items=7)
        assert result[0]["rank"] == 1
        assert result[1]["rank"] == 3
        assert result[2]["rank"] == 5

    def test_filter_handles_duplicate_ranks(self):
        """Should handle duplicate ranks (stable sort)."""
        suggestions = [
            {"rank": 1, "menu_item": "item1a"},
            {"rank": 1, "menu_item": "item1b"},
            {"rank": 2, "menu_item": "item2"},
        ]
        result = filter_priority_suggestions(suggestions, max_items=3)
        assert len(result) == 3
        # Both rank 1 items should be included

    def test_filter_max_items_zero(self):
        """max_items=0 should return empty list."""
        suggestions = [{"rank": 1, "menu_item": "item1"}]
        result = filter_priority_suggestions(suggestions, max_items=0)
        assert result == []

    def test_filter_preserves_all_fields(self):
        """Should preserve all fields in suggestions."""
        suggestions = [
            {
                "rank": 1,
                "menu_item": "pizza",
                "suggested_for": "dinner",
                "offer_type": "combo_offer",
                "confidence": "high",
            }
        ]
        result = filter_priority_suggestions(suggestions, max_items=1)
        assert result[0]["suggested_for"] == "dinner"
        assert result[0]["offer_type"] == "combo_offer"
        assert result[0]["confidence"] == "high"


class TestDeterminePlanStatus:
    """Tests for determine_plan_status function."""

    def test_status_accepted_with_priorities_ready(self):
        """Status should be accepted when priorities exist and ready."""
        status, reason_code = determine_plan_status(
            priorities_count=5,
            readiness="ready",
        )
        assert status == "accepted"
        assert reason_code == "ALLOWED"

    def test_status_degraded_no_priorities_ready(self):
        """Status should be degraded when no priorities and ready."""
        status, reason_code = determine_plan_status(
            priorities_count=0,
            readiness="ready",
        )
        assert status == "degraded"
        assert reason_code == "NO_ACTIONABLE_SUGGESTIONS"

    def test_status_blocked_data_readiness_blocked(self):
        """Status should be blocked when data readiness is blocked."""
        status, reason_code = determine_plan_status(
            priorities_count=5,
            readiness="blocked",
        )
        assert status == "blocked"
        assert reason_code == "DATA_READINESS_BLOCKED"

    def test_status_degraded_data_readiness_degraded(self):
        """Status should be degraded when data readiness is degraded."""
        status, reason_code = determine_plan_status(
            priorities_count=5,
            readiness="degraded",
        )
        assert status == "degraded"
        assert reason_code == "DATA_READINESS_DEGRADED"

    def test_status_blocked_overrides_no_priorities(self):
        """Blocked readiness should override no priorities."""
        status, reason_code = determine_plan_status(
            priorities_count=0,
            readiness="blocked",
        )
        assert status == "blocked"
        assert reason_code == "DATA_READINESS_BLOCKED"

    def test_status_degraded_readiness_overrides_ready_no_priorities(self):
        """Degraded readiness takes precedence over ready with no priorities."""
        status, reason_code = determine_plan_status(
            priorities_count=0,
            readiness="degraded",
        )
        assert status == "degraded"
        assert reason_code == "DATA_READINESS_DEGRADED"

    def test_status_single_priority_accepted(self):
        """Single priority should result in accepted status."""
        status, reason_code = determine_plan_status(
            priorities_count=1,
            readiness="ready",
        )
        assert status == "accepted"
        assert reason_code == "ALLOWED"

    def test_status_many_priorities_accepted(self):
        """Many priorities should result in accepted status."""
        status, reason_code = determine_plan_status(
            priorities_count=20,
            readiness="ready",
        )
        assert status == "accepted"
        assert reason_code == "ALLOWED"


class TestGenerateDefaultHeadline:
    """Tests for generate_default_headline function."""

    def test_headline_with_priorities(self):
        """Should generate Instagram headline when priorities exist."""
        headline = generate_default_headline(priorities_count=5)
        assert headline == "Weekly Instagram growth plan generated."

    def test_headline_without_priorities(self):
        """Should generate no suggestions headline when no priorities."""
        headline = generate_default_headline(priorities_count=0)
        assert headline == "No actionable suggestions were found for this week."

    def test_headline_single_priority(self):
        """Should generate Instagram headline with single priority."""
        headline = generate_default_headline(priorities_count=1)
        assert headline == "Weekly Instagram growth plan generated."

    def test_headline_many_priorities(self):
        """Should generate Instagram headline with many priorities."""
        headline = generate_default_headline(priorities_count=7)
        assert headline == "Weekly Instagram growth plan generated."


class TestBuildSchedulerHandoff:
    """Tests for build_scheduler_handoff function."""

    def test_handoff_single_priority(self):
        """Should build handoff with single priority."""
        priorities = [
            {
                "menu_item": "pizza",
                "suggested_daypart": "evening",
                "offer_type": "combo_offer",
                "confidence": "high",
                "rationale": "High margin item",
            }
        ]
        result = build_scheduler_handoff(priorities)
        assert len(result["recommendations"]) == 1
        assert result["recommendations"][0]["menu_item"] == "pizza"
        assert result["recommendations"][0]["daypart"] == "evening"
        assert result["recommendations"][0]["offer_type"] == "combo_offer"
        assert result["recommendations"][0]["confidence"] == "high"
        assert result["recommendations"][0]["rationale"] == "High margin item"

    def test_handoff_multiple_priorities(self):
        """Should build handoff with multiple priorities."""
        priorities = [
            {
                "menu_item": "pizza",
                "suggested_daypart": "evening",
                "offer_type": "combo_offer",
                "confidence": "high",
                "rationale": "High margin",
            },
            {
                "menu_item": "pasta",
                "suggested_daypart": "lunch",
                "offer_type": "hero_item",
                "confidence": "medium",
                "rationale": "Good volume",
            },
        ]
        result = build_scheduler_handoff(priorities)
        assert len(result["recommendations"]) == 2
        assert result["recommendations"][0]["menu_item"] == "pizza"
        assert result["recommendations"][1]["menu_item"] == "pasta"

    def test_handoff_empty_priorities(self):
        """Should return empty recommendations for empty priorities."""
        result = build_scheduler_handoff([])
        assert result["recommendations"] == []

    def test_handoff_preserves_all_fields(self):
        """Should preserve all fields in handoff."""
        priorities = [
            {
                "menu_item": "burger",
                "suggested_daypart": "afternoon",
                "offer_type": "happy_hour",
                "confidence": "low",
                "rationale": "Test rationale",
                "extra_field": "should_be_ignored",
            }
        ]
        result = build_scheduler_handoff(priorities)
        rec = result["recommendations"][0]
        assert rec["menu_item"] == "burger"
        assert rec["daypart"] == "afternoon"
        assert rec["offer_type"] == "happy_hour"
        assert rec["confidence"] == "low"
        assert rec["rationale"] == "Test rationale"

    def test_handoff_missing_optional_fields(self):
        """Should handle missing optional fields gracefully."""
        priorities = [
            {
                "menu_item": "pizza",
                # Missing all other fields
            }
        ]
        result = build_scheduler_handoff(priorities)
        rec = result["recommendations"][0]
        assert rec["menu_item"] == "pizza"
        assert rec["daypart"] is None
        assert rec["offer_type"] is None
        assert rec["confidence"] is None
        assert rec["rationale"] is None

    def test_handoff_many_priorities(self):
        """Should handle many priorities."""
        priorities = [
            {
                "menu_item": f"item_{i}",
                "suggested_daypart": "evening",
                "offer_type": "combo_offer",
                "confidence": "high",
                "rationale": f"Rationale {i}",
            }
            for i in range(1, 21)
        ]
        result = build_scheduler_handoff(priorities)
        assert len(result["recommendations"]) == 20
