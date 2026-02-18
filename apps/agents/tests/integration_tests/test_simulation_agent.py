from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_what_if_simulation_ranks_scenarios() -> None:
    response = client.post(
        "/agents/simulation/what-if",
        json={
            "contract_version": "v1",
            "analytics_id": 9,
            "location_id": 1,
            "readiness": "ready",
            "baseline": {
                "weekly_posts": 5,
                "avg_margin_pct": 0.32,
                "avg_revenue_per_post": 180.0,
            },
            "scenarios": [
                {
                    "scenario_id": "baseline_plus",
                    "name": "Baseline Plus",
                    "cadence_multiplier": 1.1,
                    "item_focus_multiplier": 1.05,
                    "bundle_multiplier": 0.4,
                    "constraint_penalty": 0.08,
                    "assumptions": ["steady supply", "normal demand"],
                },
                {
                    "scenario_id": "aggressive_push",
                    "name": "Aggressive Push",
                    "cadence_multiplier": 1.5,
                    "item_focus_multiplier": 1.2,
                    "bundle_multiplier": 0.9,
                    "constraint_penalty": 0.25,
                    "assumptions": ["higher promo load", "higher execution effort"],
                },
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["reason_code"] == "ALLOWED"
    assert body["simulation"]["winner"] is not None
    assert len(body["simulation"]["ranked_scenarios"]) == 2


def test_what_if_simulation_blocks_when_readiness_blocked() -> None:
    response = client.post(
        "/agents/simulation/what-if",
        json={
            "contract_version": "v1",
            "analytics_id": 9,
            "location_id": 1,
            "readiness": "blocked",
            "baseline": {
                "weekly_posts": 5,
                "avg_margin_pct": 0.32,
                "avg_revenue_per_post": 180.0,
            },
            "scenarios": [
                {
                    "scenario_id": "baseline_plus",
                    "name": "Baseline Plus",
                    "cadence_multiplier": 1.1,
                    "item_focus_multiplier": 1.05,
                    "bundle_multiplier": 0.4,
                    "constraint_penalty": 0.08,
                    "assumptions": [],
                }
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "blocked"
    assert body["reason_code"] == "DATA_READINESS_BLOCKED"
    assert body["simulation"]["winner"] is None
