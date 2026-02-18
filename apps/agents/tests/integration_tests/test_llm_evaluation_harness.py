from __future__ import annotations

from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_evaluation_harness_mock_mode_returns_results(monkeypatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.delenv("AGENTS_LLM_MOCK_BEHAVIOR", raising=False)
    monkeypatch.delenv("AGENTS_LLM_MOCK_RESPONSE", raising=False)

    response = client.post(
        "/agents/evaluation/harness",
        json={
            "contract_version": "v1",
            "mode": "mock",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["contract_version"] == "v1"
    assert body["harness_version"] == "ast12-v1"
    assert body["summary"]["total"] >= 7
    assert isinstance(body["results"], list)
    assert body["summary"]["total"] == len(body["results"])

    first = body["results"][0]
    assert "agent_id" in first
    assert "prompt_version" in first
    assert "model_id" in first
    assert "checks" in first
    assert "quality_score" in first


def test_evaluation_harness_live_mode_without_key_is_blocked(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post(
        "/agents/evaluation/harness",
        json={
            "contract_version": "v1",
            "mode": "live",
            "agents": ["marketer-strategist"],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["total"] == 1
    assert body["summary"]["failed"] == 1
    assert body["summary"]["release_gate_passed"] is False
    assert body["results"][0]["reason_code"] == "OPENAI_API_KEY_MISSING_FOR_LIVE_EVALUATION"
