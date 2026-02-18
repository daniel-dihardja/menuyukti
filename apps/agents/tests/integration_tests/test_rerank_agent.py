from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_rerank_applies_feedback_when_signals_sufficient() -> None:
    response = client.post(
        "/agents/rerank/recommendations",
        json={
            "contract_version": "v1",
            "policy_version": "as10-v1",
            "min_signal_count": 2,
            "baseline": [
                {
                    "recommendation_id": "rec-a",
                    "rank": 1,
                    "menu_item": "Burger",
                    "action": "promote",
                    "baseline_score": 0.65,
                },
                {
                    "recommendation_id": "rec-b",
                    "rank": 2,
                    "menu_item": "Salad",
                    "action": "improve",
                    "baseline_score": 0.61,
                },
            ],
            "priors": [
                {
                    "recommendation_id": "rec-b",
                    "sample_size": 20,
                    "success_rate": 0.8,
                    "avg_delta_revenue": 160,
                },
                {
                    "recommendation_id": "rec-a",
                    "sample_size": 18,
                    "success_rate": 0.45,
                    "avg_delta_revenue": -40,
                },
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["fallback_to_baseline"] is False
    assert body["recommendations"][0]["recommendation_id"] == "rec-b"
    assert body["recommendations"][0]["rank_delta"] > 0


def test_rerank_falls_back_to_baseline_when_signals_insufficient() -> None:
    response = client.post(
        "/agents/rerank/recommendations",
        json={
            "contract_version": "v1",
            "policy_version": "as10-v1",
            "min_signal_count": 3,
            "baseline": [
                {
                    "recommendation_id": "rec-a",
                    "rank": 1,
                    "menu_item": "Burger",
                    "action": "promote",
                    "baseline_score": 0.65,
                },
                {
                    "recommendation_id": "rec-b",
                    "rank": 2,
                    "menu_item": "Salad",
                    "action": "improve",
                    "baseline_score": 0.61,
                },
            ],
            "priors": [
                {
                    "recommendation_id": "rec-b",
                    "sample_size": 1,
                    "success_rate": 0.9,
                    "avg_delta_revenue": 300,
                }
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["fallback_to_baseline"] is True
    assert body["recommendations"][0]["recommendation_id"] == "rec-a"
