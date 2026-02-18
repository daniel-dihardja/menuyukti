from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_consensus_returns_winner_and_disagreement_reasons() -> None:
    response = client.post(
        "/agents/consensus/debate",
        json={
            "contract_version": "v1",
            "analytics_id": 11,
            "location_id": 2,
            "readiness": "ready",
            "mode": "conservative",
            "candidates": [
                {
                    "rank": 1,
                    "menu_item": "Salmon Bowl",
                    "action": "promote",
                    "confidence": "high",
                    "expected_revenue_delta": 200,
                    "expected_margin_delta": 80,
                    "risk_flags": [],
                },
                {
                    "rank": 2,
                    "menu_item": "Cheese Fries",
                    "action": "bundle",
                    "confidence": "low",
                    "expected_revenue_delta": 240,
                    "expected_margin_delta": 35,
                    "risk_flags": ["low_margin"],
                },
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["reason_code"] == "ALLOWED"
    assert body["consensus"]["winner"] is not None
    assert len(body["consensus"]["recommendations"]) >= 1
    assert len(body["consensus"]["disagreement_reasons"]) >= 1


def test_consensus_blocks_when_readiness_is_blocked() -> None:
    response = client.post(
        "/agents/consensus/debate",
        json={
            "contract_version": "v1",
            "analytics_id": 11,
            "location_id": 2,
            "readiness": "blocked",
            "mode": "aggressive",
            "candidates": [
                {
                    "rank": 1,
                    "menu_item": "Salmon Bowl",
                    "action": "promote",
                    "confidence": "high",
                    "expected_revenue_delta": 200,
                    "expected_margin_delta": 80,
                    "risk_flags": [],
                }
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "blocked"
    assert body["reason_code"] == "DATA_READINESS_BLOCKED"
    assert body["consensus"]["winner"] is None
