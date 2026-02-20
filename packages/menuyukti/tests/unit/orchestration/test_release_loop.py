"""
Unit tests for Release Loop agent.

Tests release decision logic across all stages: shadow, canary, rollout.
"""

import pytest

from menuyukti.orchestration.release_loop import (
    evaluate_release_decision,
    get_stage_metrics_summary,
)


class TestEvaluateReleaseDecision:
    """Tests for evaluate_release_decision function."""

    def test_shadow_stage_advance_with_good_metrics(self):
        """Shadow stage should advance when quality and contract pass."""
        result = evaluate_release_decision(
            stage="shadow",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.0,  # Not used in shadow
            canary_regression_rate=0.0,  # Not used in shadow
        )
        assert result["decision"] == "advance"
        assert result["reasons"] == []
        assert result["rollback_to_policy_version"] is None

    def test_shadow_stage_hold_low_quality(self):
        """Shadow stage should hold when quality is below threshold."""
        result = evaluate_release_decision(
            stage="shadow",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.5,  # Below 0.6 default
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.0,
            canary_regression_rate=0.0,
        )
        assert result["decision"] == "hold"
        assert "shadow_threshold_failed" in result["reasons"]

    def test_shadow_stage_hold_low_contract_pass_rate(self):
        """Shadow stage should hold when contract pass rate is below threshold."""
        result = evaluate_release_decision(
            stage="shadow",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.90,  # Below 0.95 default
            canary_error_rate=0.0,
            canary_regression_rate=0.0,
        )
        assert result["decision"] == "hold"
        assert "shadow_threshold_failed" in result["reasons"]

    def test_shadow_stage_hold_both_metrics_fail(self):
        """Shadow stage should hold when both metrics fail."""
        result = evaluate_release_decision(
            stage="shadow",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.5,
            shadow_contract_pass_rate=0.90,
            canary_error_rate=0.0,
            canary_regression_rate=0.0,
        )
        assert result["decision"] == "hold"
        assert "shadow_threshold_failed" in result["reasons"]

    def test_canary_stage_advance_with_good_metrics(self):
        """Canary stage should advance when error and regression within thresholds."""
        result = evaluate_release_decision(
            stage="canary",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.02,  # Below 0.05 default
            canary_regression_rate=0.05,  # Below 0.1 default
        )
        assert result["decision"] == "advance"
        assert result["reasons"] == []
        assert result["rollback_to_policy_version"] is None

    def test_canary_stage_rollback_high_error_rate(self):
        """Canary stage should rollback when error rate exceeds threshold."""
        result = evaluate_release_decision(
            stage="canary",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.08,  # Above 0.05 default
            canary_regression_rate=0.05,
        )
        assert result["decision"] == "rollback"
        assert result["rollback_to_policy_version"] == "v1"
        assert "canary_error_rate_exceeded" in result["reasons"]

    def test_canary_stage_rollback_high_regression_rate(self):
        """Canary stage should rollback when regression rate exceeds threshold."""
        result = evaluate_release_decision(
            stage="canary",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.02,
            canary_regression_rate=0.15,  # Above 0.1 default
        )
        assert result["decision"] == "rollback"
        assert result["rollback_to_policy_version"] == "v1"
        assert "canary_regression_exceeded" in result["reasons"]

    def test_canary_stage_rollback_both_metrics_exceed(self):
        """Canary stage should rollback when both metrics exceed thresholds."""
        result = evaluate_release_decision(
            stage="canary",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.08,
            canary_regression_rate=0.15,
        )
        assert result["decision"] == "rollback"
        assert result["rollback_to_policy_version"] == "v1"
        assert "canary_error_rate_exceeded" in result["reasons"]
        assert "canary_regression_exceeded" in result["reasons"]

    def test_canary_stage_hold_shadow_failed(self):
        """Canary stage should hold if shadow metrics failed."""
        result = evaluate_release_decision(
            stage="canary",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.5,  # Below threshold
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.02,
            canary_regression_rate=0.05,
        )
        assert result["decision"] == "hold"
        assert "shadow_threshold_failed" in result["reasons"]

    def test_rollout_stage_advance_with_prior_pass(self):
        """Rollout stage should advance when prior stage passed."""
        result = evaluate_release_decision(
            stage="rollout",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.02,
            canary_regression_rate=0.05,
            prior_stage_pass=True,
        )
        assert result["decision"] == "advance"
        assert result["reasons"] == []
        assert result["rollback_to_policy_version"] is None

    def test_rollout_stage_hold_prior_not_pass(self):
        """Rollout stage should hold when prior stage did not pass."""
        result = evaluate_release_decision(
            stage="rollout",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.02,
            canary_regression_rate=0.05,
            prior_stage_pass=False,
        )
        assert result["decision"] == "hold"
        assert "prior_stage_not_passed" in result["reasons"]

    def test_rollout_stage_hold_default_prior_not_pass(self):
        """Rollout stage should hold when prior_stage_pass not provided (defaults to False)."""
        result = evaluate_release_decision(
            stage="rollout",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.02,
            canary_regression_rate=0.05,
        )
        assert result["decision"] == "hold"
        assert "prior_stage_not_passed" in result["reasons"]

    def test_custom_thresholds_shadow(self):
        """Shadow stage should respect custom thresholds."""
        result = evaluate_release_decision(
            stage="shadow",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.65,
            shadow_contract_pass_rate=0.92,
            canary_error_rate=0.0,
            canary_regression_rate=0.0,
            thresholds={
                "shadow_quality_min": 0.65,
                "shadow_contract_pass_min": 0.92,
            },
        )
        assert result["decision"] == "advance"

    def test_custom_thresholds_canary(self):
        """Canary stage should respect custom thresholds."""
        result = evaluate_release_decision(
            stage="canary",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.08,
            canary_regression_rate=0.12,
            thresholds={
                "canary_error_max": 0.10,
                "canary_regression_max": 0.15,
            },
        )
        assert result["decision"] == "advance"

    def test_edge_case_quality_exactly_at_threshold(self):
        """Quality exactly at threshold should pass."""
        result = evaluate_release_decision(
            stage="shadow",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.6,  # Exactly at default threshold
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.0,
            canary_regression_rate=0.0,
        )
        assert result["decision"] == "advance"

    def test_edge_case_error_rate_exactly_at_threshold(self):
        """Error rate exactly at threshold should pass."""
        result = evaluate_release_decision(
            stage="canary",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.05,  # Exactly at default threshold
            canary_regression_rate=0.05,
        )
        assert result["decision"] == "advance"

    def test_all_thresholds_at_boundaries(self):
        """Test all metrics exactly at default thresholds."""
        result = evaluate_release_decision(
            stage="canary",
            candidate_policy_version="v2",
            baseline_policy_version="v1",
            shadow_quality_score=0.6,
            shadow_contract_pass_rate=0.95,
            canary_error_rate=0.05,
            canary_regression_rate=0.1,
        )
        assert result["decision"] == "advance"
        assert result["reasons"] == []


class TestGetStageMetricsSummary:
    """Tests for get_stage_metrics_summary function."""

    def test_shadow_stage_summary(self):
        """Shadow stage summary should include quality and contract metrics."""
        summary = get_stage_metrics_summary(
            stage="shadow",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.0,
            canary_regression_rate=0.0,
        )
        assert summary["quality_score"] == "75.00%"
        assert summary["contract_pass_rate"] == "98.00%"
        assert "error_rate" not in summary
        assert "regression_rate" not in summary

    def test_canary_stage_summary(self):
        """Canary stage summary should include error and regression metrics."""
        summary = get_stage_metrics_summary(
            stage="canary",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.02,
            canary_regression_rate=0.05,
        )
        assert summary["error_rate"] == "2.00%"
        assert summary["regression_rate"] == "5.00%"
        assert "quality_score" not in summary
        assert "contract_pass_rate" not in summary

    def test_rollout_stage_summary(self):
        """Rollout stage summary should not include metrics."""
        summary = get_stage_metrics_summary(
            stage="rollout",
            shadow_quality_score=0.75,
            shadow_contract_pass_rate=0.98,
            canary_error_rate=0.02,
            canary_regression_rate=0.05,
        )
        assert summary["stage"] == "rollout"
        assert summary["status"] == "depends_on_prior_stage_pass"

    def test_zero_metrics_formatting(self):
        """Zero metrics should format as 0.00%."""
        summary = get_stage_metrics_summary(
            stage="canary",
            shadow_quality_score=0.0,
            shadow_contract_pass_rate=0.0,
            canary_error_rate=0.0,
            canary_regression_rate=0.0,
        )
        assert summary["error_rate"] == "0.00%"
        assert summary["regression_rate"] == "0.00%"

    def test_high_metrics_formatting(self):
        """High metrics should format correctly as percentages."""
        summary = get_stage_metrics_summary(
            stage="shadow",
            shadow_quality_score=0.999,
            shadow_contract_pass_rate=0.999,
            canary_error_rate=0.0,
            canary_regression_rate=0.0,
        )
        assert summary["quality_score"] == "99.90%"
        assert summary["contract_pass_rate"] == "99.90%"
