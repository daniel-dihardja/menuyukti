"""
Unit tests for Memory Context agent.

Tests event filtering, acceptance ratio calculation, continuity signal detection, and analytics.
"""

import pytest

from menuyukti.agents.memory_context import (
    filter_recent_events,
    calculate_acceptance_ratio,
    determine_continuity_signal,
    get_memory_analytics,
)


class TestFilterRecentEvents:
    """Tests for filter_recent_events function."""

    def test_filter_returns_top_n_by_version(self):
        """Should return top N events sorted by version (desc)."""
        events = [
            {"id": "1", "version": 1, "created_at": "2024-01-01", "state": "accepted"},
            {"id": "2", "version": 3, "created_at": "2024-01-03", "state": "rejected"},
            {"id": "3", "version": 2, "created_at": "2024-01-02", "state": "accepted"},
        ]
        result = filter_recent_events(events, max_items=2)
        assert len(result) == 2
        assert result[0]["version"] == 3  # Most recent first
        assert result[1]["version"] == 2

    def test_filter_default_max_items_is_10(self):
        """Default max_items should be 10."""
        events = [
            {"id": str(i), "version": i, "created_at": f"2024-01-{i:02d}"}
            for i in range(1, 21)
        ]
        result = filter_recent_events(events)
        assert len(result) == 10

    def test_filter_fewer_events_than_max(self):
        """Should return all events if fewer than max_items."""
        events = [
            {"id": "1", "version": 1, "created_at": "2024-01-01"},
            {"id": "2", "version": 2, "created_at": "2024-01-02"},
        ]
        result = filter_recent_events(events, max_items=10)
        assert len(result) == 2

    def test_filter_empty_events(self):
        """Should return empty list for empty input."""
        result = filter_recent_events([], max_items=10)
        assert result == []

    def test_filter_single_event(self):
        """Should handle single event correctly."""
        events = [{"id": "1", "version": 1, "created_at": "2024-01-01"}]
        result = filter_recent_events(events, max_items=10)
        assert len(result) == 1
        assert result[0]["id"] == "1"

    def test_filter_same_version_sort_by_date(self):
        """Events with same version should sort by created_at (desc)."""
        events = [
            {"id": "1", "version": 1, "created_at": "2024-01-01", "state": "accepted"},
            {"id": "2", "version": 1, "created_at": "2024-01-03", "state": "rejected"},
            {"id": "3", "version": 1, "created_at": "2024-01-02", "state": "accepted"},
        ]
        result = filter_recent_events(events, max_items=3)
        assert result[0]["created_at"] == "2024-01-03"
        assert result[1]["created_at"] == "2024-01-02"
        assert result[2]["created_at"] == "2024-01-01"

    def test_filter_preserves_all_fields(self):
        """Should preserve all fields in events."""
        events = [
            {
                "id": "123",
                "version": 1,
                "created_at": "2024-01-01",
                "state": "accepted",
                "recommendation_id": "rec_123",
                "source_agent_id": "agent_123",
            }
        ]
        result = filter_recent_events(events, max_items=10)
        assert result[0]["recommendation_id"] == "rec_123"
        assert result[0]["source_agent_id"] == "agent_123"

    def test_filter_max_items_zero(self):
        """max_items=0 should return empty list."""
        events = [{"id": "1", "version": 1, "created_at": "2024-01-01"}]
        result = filter_recent_events(events, max_items=0)
        assert result == []

    def test_filter_missing_version_field(self):
        """Should handle missing version field (defaults to 0)."""
        events = [
            {"id": "1", "created_at": "2024-01-01"},  # No version
            {"id": "2", "version": 1, "created_at": "2024-01-02"},
        ]
        result = filter_recent_events(events, max_items=2)
        # Event with version 1 should come first
        assert result[0]["version"] == 1


class TestCalculateAcceptanceRatio:
    """Tests for calculate_acceptance_ratio function."""

    def test_all_accepted(self):
        """Should calculate correctly when all events are accepted."""
        events = [
            {"state": "accepted"},
            {"state": "accepted"},
            {"state": "accepted"},
        ]
        accepted, rejected, ratio = calculate_acceptance_ratio(events)
        assert accepted == 3
        assert rejected == 0
        assert ratio == 1.0

    def test_all_rejected(self):
        """Should calculate correctly when all events are rejected."""
        events = [
            {"state": "rejected"},
            {"state": "rejected"},
        ]
        accepted, rejected, ratio = calculate_acceptance_ratio(events)
        assert accepted == 0
        assert rejected == 2
        assert ratio == 0.0

    def test_mixed_accepted_rejected(self):
        """Should calculate correctly with mixed states."""
        events = [
            {"state": "accepted"},
            {"state": "rejected"},
            {"state": "accepted"},
            {"state": "accepted"},
        ]
        accepted, rejected, ratio = calculate_acceptance_ratio(events)
        assert accepted == 3
        assert rejected == 1
        assert ratio == pytest.approx(0.75)

    def test_empty_events(self):
        """Should handle empty events list."""
        accepted, rejected, ratio = calculate_acceptance_ratio([])
        assert accepted == 0
        assert rejected == 0
        assert ratio == 0.0

    def test_single_accepted(self):
        """Should handle single accepted event."""
        events = [{"state": "accepted"}]
        accepted, rejected, ratio = calculate_acceptance_ratio(events)
        assert accepted == 1
        assert rejected == 0
        assert ratio == 1.0

    def test_single_rejected(self):
        """Should handle single rejected event."""
        events = [{"state": "rejected"}]
        accepted, rejected, ratio = calculate_acceptance_ratio(events)
        assert accepted == 0
        assert rejected == 1
        assert ratio == 0.0

    def test_unknown_state_not_counted(self):
        """Unknown states should not be counted as accepted or rejected."""
        events = [
            {"state": "accepted"},
            {"state": "unknown"},
            {"state": "rejected"},
        ]
        accepted, rejected, ratio = calculate_acceptance_ratio(events)
        assert accepted == 1
        assert rejected == 1
        assert ratio == pytest.approx(0.5)

    def test_fifty_fifty_split(self):
        """Should calculate 0.5 ratio for 50/50 split."""
        events = [
            {"state": "accepted"},
            {"state": "rejected"},
        ]
        accepted, rejected, ratio = calculate_acceptance_ratio(events)
        assert accepted == 1
        assert rejected == 1
        assert ratio == 0.5


class TestDetermineContinuitySignal:
    """Tests for determine_continuity_signal function."""

    def test_signal_stable_accepted_more_than_rejected(self):
        """Should return stable when accepted > rejected."""
        signal = determine_continuity_signal(accepted_count=3, rejected_count=1)
        assert signal == "stable"

    def test_signal_stable_accepted_equals_rejected(self):
        """Should return stable when accepted == rejected."""
        signal = determine_continuity_signal(accepted_count=2, rejected_count=2)
        assert signal == "stable"

    def test_signal_caution_rejected_more_than_accepted(self):
        """Should return caution when rejected > accepted."""
        signal = determine_continuity_signal(accepted_count=1, rejected_count=3)
        assert signal == "caution"

    def test_signal_stable_all_accepted(self):
        """Should return stable when all accepted."""
        signal = determine_continuity_signal(accepted_count=5, rejected_count=0)
        assert signal == "stable"

    def test_signal_caution_all_rejected(self):
        """Should return caution when all rejected."""
        signal = determine_continuity_signal(accepted_count=0, rejected_count=5)
        assert signal == "caution"

    def test_signal_stable_zero_both(self):
        """Should return stable when both are zero."""
        signal = determine_continuity_signal(accepted_count=0, rejected_count=0)
        assert signal == "stable"

    def test_signal_boundary_exactly_equal(self):
        """Boundary case: exactly equal should be stable."""
        signal = determine_continuity_signal(accepted_count=10, rejected_count=10)
        assert signal == "stable"

    def test_signal_boundary_one_more_accepted(self):
        """Boundary case: one more accepted should be stable."""
        signal = determine_continuity_signal(accepted_count=11, rejected_count=10)
        assert signal == "stable"

    def test_signal_boundary_one_more_rejected(self):
        """Boundary case: one more rejected should be caution."""
        signal = determine_continuity_signal(accepted_count=10, rejected_count=11)
        assert signal == "caution"


class TestGetMemoryAnalytics:
    """Tests for get_memory_analytics function."""

    def test_analytics_with_mixed_events(self):
        """Should return complete analytics with mixed events."""
        events = [
            {"id": "1", "version": 3, "created_at": "2024-01-03", "state": "accepted"},
            {"id": "2", "version": 2, "created_at": "2024-01-02", "state": "rejected"},
            {"id": "3", "version": 1, "created_at": "2024-01-01", "state": "accepted"},
        ]
        result = get_memory_analytics(events, max_items=10)
        assert len(result["recent_events"]) == 3
        assert result["accepted_count"] == 2
        assert result["rejected_count"] == 1
        assert result["continuity_signal"] == "stable"

    def test_analytics_respects_max_items(self):
        """Should respect max_items limit."""
        events = [
            {
                "id": str(i),
                "version": i,
                "created_at": f"2024-01-{i:02d}",
                "state": "accepted",
            }
            for i in range(1, 11)
        ]
        result = get_memory_analytics(events, max_items=5)
        assert len(result["recent_events"]) == 5
        assert result["accepted_count"] == 5
        assert result["rejected_count"] == 0

    def test_analytics_empty_events(self):
        """Should handle empty events list."""
        result = get_memory_analytics([], max_items=10)
        assert result["recent_events"] == []
        assert result["accepted_count"] == 0
        assert result["rejected_count"] == 0
        assert result["continuity_signal"] == "stable"

    def test_analytics_single_event_accepted(self):
        """Should analyze single accepted event."""
        events = [
            {"id": "1", "version": 1, "created_at": "2024-01-01", "state": "accepted"}
        ]
        result = get_memory_analytics(events, max_items=10)
        assert len(result["recent_events"]) == 1
        assert result["accepted_count"] == 1
        assert result["rejected_count"] == 0
        assert result["continuity_signal"] == "stable"

    def test_analytics_single_event_rejected(self):
        """Should analyze single rejected event."""
        events = [
            {"id": "1", "version": 1, "created_at": "2024-01-01", "state": "rejected"}
        ]
        result = get_memory_analytics(events, max_items=10)
        assert len(result["recent_events"]) == 1
        assert result["accepted_count"] == 0
        assert result["rejected_count"] == 1
        assert result["continuity_signal"] == "caution"

    def test_analytics_all_rejected_caution_signal(self):
        """Should return caution signal when all rejected."""
        events = [
            {"id": "1", "version": 1, "created_at": "2024-01-01", "state": "rejected"},
            {"id": "2", "version": 2, "created_at": "2024-01-02", "state": "rejected"},
        ]
        result = get_memory_analytics(events, max_items=10)
        assert result["accepted_count"] == 0
        assert result["rejected_count"] == 2
        assert result["continuity_signal"] == "caution"

    def test_analytics_sorting_by_recent(self):
        """Should return recent events first."""
        events = [
            {"id": "1", "version": 1, "created_at": "2024-01-01", "state": "accepted"},
            {"id": "3", "version": 3, "created_at": "2024-01-03", "state": "rejected"},
            {"id": "2", "version": 2, "created_at": "2024-01-02", "state": "accepted"},
        ]
        result = get_memory_analytics(events, max_items=10)
        # Most recent should be first
        assert result["recent_events"][0]["version"] == 3
        assert result["recent_events"][1]["version"] == 2
        assert result["recent_events"][2]["version"] == 1

    def test_analytics_default_max_items_is_10(self):
        """Default max_items should be 10."""
        events = [
            {
                "id": str(i),
                "version": i,
                "created_at": f"2024-01-{i:02d}",
                "state": "accepted",
            }
            for i in range(1, 21)
        ]
        result = get_memory_analytics(events)
        assert len(result["recent_events"]) == 10

    def test_analytics_preserves_event_structure(self):
        """Should preserve complete event structure."""
        events = [
            {
                "id": "123",
                "version": 1,
                "created_at": "2024-01-01",
                "state": "accepted",
                "recommendation_id": "rec_123",
                "source_agent_id": "agent_123",
            }
        ]
        result = get_memory_analytics(events, max_items=10)
        event = result["recent_events"][0]
        assert event["recommendation_id"] == "rec_123"
        assert event["source_agent_id"] == "agent_123"

    def test_analytics_integration_test_complex_scenario(self):
        """Integration test with complex event history."""
        events = [
            {
                "id": f"e{i}",
                "version": i,
                "created_at": f"2024-01-{(i % 28) + 1:02d}",
                "state": "accepted" if i % 3 != 0 else "rejected",
            }
            for i in range(1, 31)
        ]
        result = get_memory_analytics(events, max_items=10)
        assert len(result["recent_events"]) == 10
        # Most recent version should be first
        assert result["recent_events"][0]["version"] == 30
        # Should have correct counts for the top 10
        expected_accepted = sum(
            1 for e in result["recent_events"] if e["state"] == "accepted"
        )
        assert result["accepted_count"] == expected_accepted
