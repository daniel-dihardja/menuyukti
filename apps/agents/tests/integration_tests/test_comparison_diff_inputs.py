from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_deterministic_status_changes_for_comparison_inputs() -> None:
    ready_response = client.post(
        "/agents/strategist/weekly-plan",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "week_start_date": "2026-02-16",
            "readiness": "ready",
            "suggestions": [],
        },
    )
    blocked_response = client.post(
        "/agents/strategist/weekly-plan",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "week_start_date": "2026-02-16",
            "readiness": "blocked",
            "suggestions": [],
        },
    )

    assert ready_response.status_code == 200
    assert blocked_response.status_code == 200
    ready_body = ready_response.json()
    blocked_body = blocked_response.json()
    assert ready_body["status"] != blocked_body["status"]
    assert ready_body["reason_code"] != blocked_body["reason_code"]
