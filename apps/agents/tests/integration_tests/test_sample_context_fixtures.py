from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_sample_fixture_strategist() -> None:
    response = client.post(
        "/agents/strategist/weekly-plan",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "week_start_date": "2026-02-18",
            "readiness": "ready",
            "suggestions": [
                {
                    "rank": 1,
                    "menu_item": "Sample Item",
                    "suggested_for": "Mon 12:00",
                    "suggested_daypart": "lunch",
                    "offer_type": "hero_item",
                    "rationale": "sample",
                    "confidence": "high",
                }
            ],
        },
    )
    assert response.status_code == 200


def test_sample_fixture_profit_intelligence() -> None:
    response = client.post(
        "/agents/profit-intelligence/action-board",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "cogs_readiness": "ready",
            "candidates": [
                {
                    "menu_item": "Sample Item",
                    "matrix_action": "promote",
                    "margin_pct": 0.3,
                    "units_sold": 40,
                    "revenue": 900,
                    "impact_score": 0.7,
                    "combo_supported": False,
                    "attribution_delta_revenue": 0,
                }
            ],
            "combo_signals": [],
        },
    )
    assert response.status_code == 200


def test_sample_fixture_consensus() -> None:
    response = client.post(
        "/agents/consensus/debate",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "mode": "conservative",
            "candidates": [
                {
                    "rank": 1,
                    "menu_item": "Sample Item",
                    "action": "promote",
                    "confidence": "high",
                    "expected_revenue_delta": 100,
                    "expected_margin_delta": 30,
                    "risk_flags": [],
                }
            ],
        },
    )
    assert response.status_code == 200


def test_sample_fixture_simulation() -> None:
    response = client.post(
        "/agents/simulation/what-if",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "baseline": {
                "weekly_posts": 4,
                "avg_margin_pct": 0.25,
                "avg_revenue_per_post": 140,
            },
            "scenarios": [
                {
                    "scenario_id": "sample",
                    "name": "Sample Scenario",
                    "cadence_multiplier": 1.1,
                    "item_focus_multiplier": 1.0,
                    "bundle_multiplier": 0.3,
                    "constraint_penalty": 0.1,
                    "assumptions": ["sample"],
                }
            ],
        },
    )
    assert response.status_code == 200


def test_sample_fixture_memory() -> None:
    response = client.post(
        "/agents/memory/context",
        json={
            "contract_version": "v1",
            "location_id": 1,
            "analytics_id": 1,
            "events": [
                {
                    "id": "sample-memory-1",
                    "version": 1,
                    "recommendation_id": "sample-rec",
                    "source_agent_id": "menu-profit-intelligence",
                    "state": "accepted",
                    "created_at": "2026-02-18T00:00:00.000Z",
                }
            ],
        },
    )
    assert response.status_code == 200


def test_sample_fixture_rerank() -> None:
    response = client.post(
        "/agents/rerank/recommendations",
        json={
            "contract_version": "v1",
            "policy_version": "as10-v1",
            "min_signal_count": 1,
            "baseline": [
                {
                    "recommendation_id": "sample-rec",
                    "rank": 1,
                    "menu_item": "Sample Item",
                    "action": "promote",
                    "baseline_score": 0.5,
                }
            ],
            "priors": [
                {
                    "recommendation_id": "sample-rec",
                    "sample_size": 10,
                    "success_rate": 0.7,
                    "avg_delta_revenue": 90,
                }
            ],
        },
    )
    assert response.status_code == 200


def test_sample_fixture_release_loop() -> None:
    response = client.post(
        "/agents/learning/release-loop/evaluate",
        json={
            "contract_version": "v1",
            "stage": "shadow",
            "candidate_policy_version": "sample-v2",
            "baseline_policy_version": "sample-v1",
            "metrics": {
                "shadow_quality_score": 0.8,
                "shadow_contract_pass_rate": 0.98,
                "canary_error_rate": 0.01,
                "canary_regression_rate": 0.02,
            },
        },
    )
    assert response.status_code == 200

