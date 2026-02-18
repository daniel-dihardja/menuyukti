from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_learning_eligibility_filters_weak_outcomes() -> None:
    response = client.post(
        "/agents/learning/eligibility",
        json={
            "contract_version": "v1",
            "min_sample_size": 7,
            "min_abs_delta_revenue": 25,
            "events": [
                {
                    "linkage_key": "loc:1:an:1:rec:a",
                    "signal_type": "outcome_delta",
                    "outcome_delta_revenue": 120,
                    "outcome_delta_qty": 14,
                    "outcome_confidence": "high",
                    "sample_size": 20,
                },
                {
                    "linkage_key": "loc:1:an:1:rec:b",
                    "signal_type": "outcome_delta",
                    "outcome_delta_revenue": 5,
                    "outcome_delta_qty": 2,
                    "outcome_confidence": "low",
                    "sample_size": 3,
                },
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["eligibility"][0]["eligible"] is True
    assert body["eligibility"][1]["eligible"] is False
    assert "sample_size_below_minimum" in body["eligibility"][1]["reasons"]
