"""
Agent: What-If Simulation

Simulate impact of different menu optimization scenarios on revenue and margin.

Pure function (no frameworks). Used by apps/agents/simulation.py.
"""

from typing import Literal

ConfidenceBand = Literal["narrow", "medium", "wide"]


def _confidence_band(penalty: float, readiness: str) -> ConfidenceBand:
    """
    Determine confidence band based on penalty and readiness.

    Args:
        penalty: Constraint penalty (0-1)
        readiness: Data readiness status

    Returns:
        Confidence band: narrow/medium/wide
    """
    if readiness == "blocked":
        return "wide"
    if penalty >= 0.3:
        return "wide"
    if penalty >= 0.12 or readiness == "degraded":
        return "medium"
    return "narrow"


def _confidence_range(value: float, band: ConfidenceBand) -> tuple[float, float]:
    """
    Calculate confidence range around a value.

    Args:
        value: Central value
        band: Confidence band (narrow/medium/wide)

    Returns:
        Tuple of (low, high) bounds
    """
    spread = 0.08 if band == "narrow" else 0.16 if band == "medium" else 0.3
    low = max(0.0, value * (1 - spread))
    high = max(0.0, value * (1 + spread))
    return (round(low, 2), round(high, 2))


def simulate_scenario(
    scenario: dict,
    baseline_revenue: float,
    baseline_margin_pct: float,
    readiness: str = "ready",
) -> dict:
    """
    Simulate a single optimization scenario.

    Args:
        scenario: Scenario dict with fields:
            - scenario_id (str): Unique scenario identifier
            - name (str): Scenario name
            - cadence_multiplier (float): Posting frequency multiplier (0-3)
            - item_focus_multiplier (float): Focus on specific items (0-3)
            - bundle_multiplier (float): Bundle promotion multiplier (0-2)
            - constraint_penalty (float): Operational constraint penalty (0-1)
            - assumptions (list[str], optional): Assumptions behind scenario
        baseline_revenue: Weekly baseline revenue
        baseline_margin_pct: Baseline margin percentage (0-1)
        readiness: Data readiness status for confidence calculation

    Returns:
        Simulation result dict with projections and confidence bounds
    """
    cadence_mult = scenario.get("cadence_multiplier", 1.0)
    focus_mult = scenario.get("item_focus_multiplier", 1.0)
    bundle_mult = scenario.get("bundle_multiplier", 0.0)
    constraint_penalty = scenario.get("constraint_penalty", 0.0)

    # Gross revenue impact from multipliers
    gross_revenue = (
        baseline_revenue * cadence_mult * focus_mult * (1 + (bundle_mult * 0.08))
    )

    # Apply constraint penalty (operational limitations)
    projected_revenue = gross_revenue * (1 - constraint_penalty)

    # Margin projection with diminishing returns at scale
    projected_margin = (
        projected_revenue
        * baseline_margin_pct
        * (1 + bundle_mult * 0.05)
        * (1 - constraint_penalty * 0.5)
    )

    # Calculate uplift vs baseline
    expected_uplift = projected_revenue - baseline_revenue

    # Determine confidence band
    confidence_band = _confidence_band(constraint_penalty, readiness)

    # Calculate confidence ranges
    revenue_low, revenue_high = _confidence_range(projected_revenue, confidence_band)
    margin_low, margin_high = _confidence_range(projected_margin, confidence_band)

    # Scenario score: margin (55%) + uplift (35%) - constraints (10%)
    score = (
        (projected_margin * 0.55)
        + (max(0.0, expected_uplift) * 0.35)
        - (constraint_penalty * 100)
    )

    return {
        "scenario_id": scenario.get("scenario_id", "unknown"),
        "name": scenario.get("name", ""),
        "assumptions": scenario.get("assumptions", []),
        "metrics": {
            "projected_revenue": round(projected_revenue, 2),
            "projected_margin": round(projected_margin, 2),
            "expected_uplift": round(expected_uplift, 2),
        },
        "confidence": {
            "band": confidence_band,
            "revenue_low": revenue_low,
            "revenue_high": revenue_high,
            "margin_low": margin_low,
            "margin_high": margin_high,
        },
        "rationale": (
            f"{scenario.get('name', 'Scenario')} balances cadence"
            f"({cadence_mult}) and focus({focus_mult}) with constraint "
            f"penalty {constraint_penalty}."
        ),
        "simulation_score": round(score, 3),
    }


def rank_scenarios(
    scenarios: list[dict],
    baseline_revenue: float,
    baseline_margin_pct: float,
    readiness: str = "ready",
) -> list[dict]:
    """
    Simulate and rank optimization scenarios.

    Args:
        scenarios: List of scenario dicts (see simulate_scenario for format)
        baseline_revenue: Weekly baseline revenue
        baseline_margin_pct: Baseline margin percentage (0-1)
        readiness: Data readiness status

    Returns:
        List of ranked scenarios with simulations (highest score first)
    """
    if not scenarios:
        return []

    # Simulate each scenario
    ranked = []
    for scenario in scenarios:
        result = simulate_scenario(
            scenario=scenario,
            baseline_revenue=baseline_revenue,
            baseline_margin_pct=baseline_margin_pct,
            readiness=readiness,
        )
        ranked.append(result)

    # Sort by simulation score (descending)
    ranked.sort(key=lambda row: row["simulation_score"], reverse=True)

    return ranked


def get_winning_scenario(ranked_scenarios: list[dict]) -> dict | None:
    """
    Get the top-scoring scenario.

    Args:
        ranked_scenarios: Results from rank_scenarios()

    Returns:
        Top scenario or None if no scenarios
    """
    return ranked_scenarios[0] if ranked_scenarios else None
