from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_tool_invoke_allows_marketer_planning_decision_context_read() -> None:
    response = client.post(
        "/tools/invoke",
        json={
            "contract_version": "v1",
            "tool_id": "decision_context.read",
            "persona": "marketer",
            "workflow_stage": "planning",
            "scope": {"location_id": 1, "analytics_id": 1},
            "payload": {},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["reason_code"] == "ALLOWED"


def test_tool_invoke_blocks_disallowed_persona_stage() -> None:
    response = client.post(
        "/tools/invoke",
        json={
            "contract_version": "v1",
            "tool_id": "scheduler.handoff",
            "persona": "analyst",
            "workflow_stage": "analysis",
            "scope": {"location_id": 1, "analytics_id": 1},
            "payload": {"recommendations": ["a"]},
        },
    )

    assert response.status_code == 403
    body = response.json()
    assert body["status"] == "blocked"
    assert body["reason_code"] == "TOOL_NOT_ALLOWED_FOR_PERSONA_STAGE"


def test_tool_invoke_rejects_invalid_contract_payload() -> None:
    response = client.post(
        "/tools/invoke",
        json={
            "contract_version": "v1",
            "tool_id": "scheduler.handoff",
            "persona": "marketer",
            "workflow_stage": "planning",
            "scope": {"location_id": 1, "analytics_id": 1},
            "payload": {},
        },
    )

    assert response.status_code == 400
    body = response.json()
    assert body["status"] == "invalid"
    assert body["reason_code"] == "TOOL_CONTRACT_VALIDATION_FAILED_RECOMMENDATIONS_REQUIRED"
