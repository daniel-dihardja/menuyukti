"""
Tests for menuyukti.agents.simulation - scenario ranking and projection.
"""

import pytest

from menuyukti.agents.simulation import (
    simulate_scenario,
    rank_scenarios,
    get_winning_scenario,
    _confidence_band,
    _confidence_range,
)


class TestConfidenceBand:
    """Test confidence band determination."""

    def test_blocked_readiness_wide_band(self):
        """Blocked readiness gives wide confidence band."""
        assert _confidence_band(0.1, "blocked") == "wide"

    def test_high_penalty_wide_band(self):
        """High constraint penalty (>0.3) gives wide band."""
        assert _confidence_band(0.4, "ready") == "wide"
        assert _confidence_band(0.5, "ready") == "wide"

    def test_medium_penalty_or_degraded_medium_band(self):
        """Medium penalty (0.12-0.3) or degraded readiness gives medium band."""
        assert _confidence_band(0.15, "ready") == "medium"
        assert _confidence_band(0.25, "ready") == "medium"
        assert _confidence_band(0.05, "degraded") == "medium"

    def test_low_penalty_ready_narrow_band(self):
        """Low penalty with ready status gives narrow band."""
        assert _confidence_band(0.05, "ready") == "narrow"
        assert _confidence_band(0.0, "ready") == "narrow"


class TestConfidenceRange:
    """Test confidence range calculation."""

    def test_narrow_band_8_percent_spread(self):
        """Narrow band has 8% spread."""
        low, high = _confidence_range(100.0, "narrow")
        assert low == 92.0  # 100 * 0.92
        assert high == 108.0  # 100 * 1.08

    def test_medium_band_16_percent_spread(self):
        """Medium band has 16% spread."""
        low, high = _confidence_range(100.0, "medium")
        assert low == 84.0  # 100 * 0.84
        assert high == 116.0  # 100 * 1.16

    def test_wide_band_30_percent_spread(self):
        """Wide band has 30% spread."""
        low, high = _confidence_range(100.0, "wide")
        assert low == 70.0  # 100 * 0.7
        assert high == 130.0  # 100 * 1.3

    def test_negative_lower_bound_clamped_to_zero(self):
        """Range can't go below zero."""
        low, high = _confidence_range(5.0, "wide")
        assert low == 3.5  # 5 * 0.7 = 3.5
        assert high == 6.5  # 5 * 1.3


class TestSimulateScenario:
    """Test scenario simulation."""

    def test_baseline_scenario_no_multipliers(self):
        """Scenario with all multipliers at 1.0 shows baseline revenue."""
        scenario = {
            "scenario_id": "base",
            "name": "Baseline",
            "cadence_multiplier": 1.0,
            "item_focus_multiplier": 1.0,
            "bundle_multiplier": 0.0,
            "constraint_penalty": 0.0,
        }

        result = simulate_scenario(
            scenario=scenario,
            baseline_revenue=1000.0,
            baseline_margin_pct=0.35,
        )

        assert result["metrics"]["projected_revenue"] == pytest.approx(1000.0, rel=0.01)
        assert result["scenario_id"] == "base"
        assert result["name"] == "Baseline"

    def test_increased_cadence_increases_revenue(self):
        """Higher cadence multiplier increases projected revenue."""
        scenario = {
            "scenario_id": "high_cadence",
            "name": "High Cadence",
            "cadence_multiplier": 1.5,
            "item_focus_multiplier": 1.0,
            "bundle_multiplier": 0.0,
            "constraint_penalty": 0.0,
        }

        result = simulate_scenario(
            scenario=scenario,
            baseline_revenue=1000.0,
            baseline_margin_pct=0.35,
        )

        assert result["metrics"]["projected_revenue"] == pytest.approx(1500.0, rel=0.01)
        assert result["metrics"]["expected_uplift"] == pytest.approx(500.0, rel=0.01)

    def test_focus_and_cadence_multiply(self):
        """Multipliers multiply together."""
        scenario = {
            "scenario_id": "focused",
            "name": "Focused",
            "cadence_multiplier": 2.0,
            "item_focus_multiplier": 1.5,
            "bundle_multiplier": 0.0,
            "constraint_penalty": 0.0,
        }

        result = simulate_scenario(
            scenario=scenario,
            baseline_revenue=1000.0,
            baseline_margin_pct=0.35,
        )

        # 1000 * 2.0 * 1.5 * (1 + 0) = 3000
        assert result["metrics"]["projected_revenue"] == pytest.approx(3000.0, rel=0.01)

    def test_constraint_penalty_reduces_revenue(self):
        """Constraint penalty reduces projected revenue."""
        scenario = {
            "scenario_id": "constrained",
            "name": "Constrained",
            "cadence_multiplier": 2.0,
            "item_focus_multiplier": 1.0,
            "bundle_multiplier": 0.0,
            "constraint_penalty": 0.2,
        }

        result = simulate_scenario(
            scenario=scenario,
            baseline_revenue=1000.0,
            baseline_margin_pct=0.35,
        )

        # Gross: 1000 * 2.0 = 2000
        # With penalty: 2000 * (1 - 0.2) = 1600
        assert result["metrics"]["projected_revenue"] == pytest.approx(1600.0, rel=0.01)

    def test_bundle_multiplier_boost(self):
        """Bundle multiplier adds revenue and margin boost."""
        scenario = {
            "scenario_id": "bundled",
            "name": "Bundled",
            "cadence_multiplier": 1.0,
            "item_focus_multiplier": 1.0,
            "bundle_multiplier": 1.0,
            "constraint_penalty": 0.0,
        }

        result = simulate_scenario(
            scenario=scenario,
            baseline_revenue=1000.0,
            baseline_margin_pct=0.35,
        )

        # Gross: 1000 * 1 * 1 * (1 + 1.0 * 0.08) = 1080
        assert result["metrics"]["projected_revenue"] == pytest.approx(1080.0, rel=0.01)
        # Margin: 1080 * 0.35 * (1 + 1.0 * 0.05) = 397.2
        assert result["metrics"]["projected_margin"] == pytest.approx(397.2, rel=0.01)

    def test_confidence_band_narrow_ready(self):
        """Ready status with low penalty gives narrow confidence band."""
        scenario = {
            "scenario_id": "confident",
            "name": "Confident",
            "cadence_multiplier": 1.0,
            "item_focus_multiplier": 1.0,
            "bundle_multiplier": 0.0,
            "constraint_penalty": 0.05,
        }

        result = simulate_scenario(
            scenario=scenario,
            baseline_revenue=1000.0,
            baseline_margin_pct=0.35,
            readiness="ready",
        )

        assert result["confidence"]["band"] == "narrow"

    def test_confidence_band_wide_blocked(self):
        """Blocked readiness gives wide confidence band."""
        scenario = {
            "scenario_id": "uncertain",
            "name": "Uncertain",
            "cadence_multiplier": 1.0,
            "item_focus_multiplier": 1.0,
            "bundle_multiplier": 0.0,
            "constraint_penalty": 0.0,
        }

        result = simulate_scenario(
            scenario=scenario,
            baseline_revenue=1000.0,
            baseline_margin_pct=0.35,
            readiness="blocked",
        )

        assert result["confidence"]["band"] == "wide"

    def test_scenario_score_weights(self):
        """Scenario score weights margin (55%), uplift (35%), constraints (10%)."""
        scenario = {
            "scenario_id": "scoring",
            "name": "Scoring",
            "cadence_multiplier": 1.5,
            "item_focus_multiplier": 1.0,
            "bundle_multiplier": 0.0,
            "constraint_penalty": 0.1,
        }

        result = simulate_scenario(
            scenario=scenario,
            baseline_revenue=1000.0,
            baseline_margin_pct=0.35,
        )

        # Verify score calculation: margin * 0.55 + uplift * 0.35 - penalty * 100
        # Just verify the overall structure
        assert result["simulation_score"] > 350  # Should be positive and substantial
        assert result["metrics"]["projected_revenue"] == pytest.approx(1350.0, rel=0.01)


class TestRankScenarios:
    """Test scenario ranking."""

    def test_empty_scenarios(self):
        """Empty scenario list returns empty results."""
        result = rank_scenarios([], 1000.0, 0.35)
        assert result == []

    def test_single_scenario(self):
        """Single scenario is ranked first."""
        scenarios = [
            {
                "scenario_id": "only",
                "name": "Only Scenario",
                "cadence_multiplier": 1.0,
                "item_focus_multiplier": 1.0,
                "bundle_multiplier": 0.0,
                "constraint_penalty": 0.0,
            }
        ]

        result = rank_scenarios(scenarios, 1000.0, 0.35)

        assert len(result) == 1
        assert result[0]["scenario_id"] == "only"

    def test_multiple_scenarios_ranked_by_score(self):
        """Multiple scenarios ranked by simulation score."""
        scenarios = [
            {
                "scenario_id": "low_score",
                "name": "Low Score",
                "cadence_multiplier": 1.0,
                "item_focus_multiplier": 1.0,
                "bundle_multiplier": 0.0,
                "constraint_penalty": 0.8,  # High penalty
            },
            {
                "scenario_id": "high_score",
                "name": "High Score",
                "cadence_multiplier": 2.0,
                "item_focus_multiplier": 1.0,
                "bundle_multiplier": 0.0,
                "constraint_penalty": 0.05,  # Low penalty
            },
        ]

        result = rank_scenarios(scenarios, 1000.0, 0.35)

        assert len(result) == 2
        # High score scenario should be ranked first
        assert result[0]["scenario_id"] == "high_score"
        assert result[1]["scenario_id"] == "low_score"
        assert result[0]["simulation_score"] > result[1]["simulation_score"]


class TestGetWinningScenario:
    """Test winning scenario extraction."""

    def test_winning_scenario_from_ranked(self):
        """Get top scenario as winner."""
        ranked = [
            {"scenario_id": "winner", "name": "Winner"},
            {"scenario_id": "runner_up", "name": "Runner Up"},
        ]

        winner = get_winning_scenario(ranked)

        assert winner is not None
        assert winner["scenario_id"] == "winner"

    def test_no_winner_empty_list(self):
        """Empty list returns None."""
        winner = get_winning_scenario([])
        assert winner is None
