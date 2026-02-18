from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_memory_context_summarizes_recent_events() -> None:
    response = client.post(
        "/agents/memory/context",
        json={
            "contract_version": "v1",
            "location_id": 1,
            "analytics_id": 12,
            "max_items": 3,
            "events": [
                {
                    "id": "m-1",
                    "version": 1,
                    "recommendation_id": "rec-a",
                    "source_agent_id": "menu-profit-intelligence",
                    "state": "accepted",
                    "created_at": "2026-02-18T10:00:00.000Z",
                },
                {
                    "id": "m-2",
                    "version": 2,
                    "recommendation_id": "rec-b",
                    "source_agent_id": "menu-profit-intelligence",
                    "state": "rejected",
                    "created_at": "2026-02-18T10:10:00.000Z",
                },
                {
                    "id": "m-3",
                    "version": 3,
                    "recommendation_id": "rec-c",
                    "source_agent_id": "multi-agent-consensus",
                    "state": "accepted",
                    "created_at": "2026-02-18T10:20:00.000Z",
                },
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["memory_context"]["accepted_count"] == 2
    assert body["memory_context"]["rejected_count"] == 1
    assert len(body["memory_context"]["recent_events"]) == 3
    assert body["memory_context"]["continuity_signal"] == "stable"
