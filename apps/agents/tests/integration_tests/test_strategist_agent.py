from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_strategist_weekly_plan_accepts_and_returns_priorities() -> None:
    response = client.post(
        "/agents/strategist/weekly-plan",
        json={
            "contract_version": "v1",
            "analytics_id": 12,
            "location_id": 7,
            "week_start_date": "2026-02-16",
            "readiness": "ready",
            "suggestions": [
                {
                    "rank": 1,
                    "menu_item": "Spicy Tuna Roll",
                    "suggested_for": "Mon 12:00",
                    "suggested_daypart": "lunch",
                    "offer_type": "hero_item",
                    "rationale": "Strong lunch demand and margin signal.",
                    "confidence": "high",
                }
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["reason_code"] == "ALLOWED"
    assert body["agent_id"] == "marketer-strategist"
    assert len(body["plan"]["priorities"]) == 1
    assert len(body["scheduler_handoff"]["recommendations"]) == 1


def test_strategist_weekly_plan_blocks_when_readiness_is_blocked() -> None:
    response = client.post(
        "/agents/strategist/weekly-plan",
        json={
            "contract_version": "v1",
            "analytics_id": 12,
            "location_id": 7,
            "week_start_date": "2026-02-16",
            "readiness": "blocked",
            "suggestions": [
                {
                    "rank": 1,
                    "menu_item": "Spicy Tuna Roll",
                    "suggested_for": "Mon 12:00",
                    "suggested_daypart": "lunch",
                    "offer_type": "hero_item",
                    "rationale": "Strong lunch demand and margin signal.",
                    "confidence": "high",
                }
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "blocked"
    assert body["reason_code"] == "DATA_READINESS_BLOCKED"
    assert body["plan"]["priorities"] == []
