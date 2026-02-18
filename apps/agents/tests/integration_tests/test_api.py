from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_openapi_docs_available() -> None:
    response = client.get("/docs")

    assert response.status_code == 200

def test_invoke_tool_endpoint_accepts_allowed_request() -> None:
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
