from __future__ import annotations

from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_prompt_tuning_loop_api_returns_per_agent_approvals(monkeypatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.delenv("AGENTS_LLM_MOCK_BEHAVIOR", raising=False)
    monkeypatch.delenv("AGENTS_LLM_MOCK_RESPONSE", raising=False)

    response = client.post(
        "/agents/evaluation/prompt-tuning",
        json={
            "contract_version": "v1",
            "mode": "mock",
            "agents": ["marketer-strategist", "menu-profit-intelligence"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["contract_version"] == "v1"
    assert body["tuning_loop_version"] == "ast15-v1"
    approved = body["approved_prompt_versions"]
    assert approved["marketer-strategist"] == "v1-tuned"
    assert approved["menu-profit-intelligence"] == "v1-tuned"
