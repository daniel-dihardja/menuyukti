from __future__ import annotations

from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


def test_pilot_prompt_tuning_test_agent_invocation() -> None:
    response = client.post(
        "/agents/pilot/prompt-tuning/test-agent",
        json={
            "contract_version": "v1",
            "scenario_id": "pilot-001",
            "restaurant_name": "Sushi Go",
            "menu_item": "Spicy Tuna Roll",
            "target_audience": "young professionals",
            "tone": "premium",
            "objective": "traffic",
            "daypart": "evening",
            "price_band": "mid",
            "inventory_pressure": "medium",
            "brand_guardrails": ["no fake discounts"],
            "forbidden_phrases": ["cheap"],
            "must_include_terms": ["limited"],
            "candidate_actions": ["promote_bundle", "highlight_signature"],
            "evidence_facts": ["Evening conversion increased by 12%"],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["agent_id"] == "prompt-tuning-test-agent"
    assert body["task"] == "campaign-offer-brief-generator"
    assert body["primary_action"] in {"promote_bundle", "highlight_signature"}
    assert body["fallback_action"] in {"promote_bundle", "highlight_signature"}
    assert body["primary_action"] != body["fallback_action"]
    assert "Spicy Tuna Roll" in body["headline"]
    assert isinstance(body["hashtags"], list)
    assert 2 <= len(body["hashtags"]) <= 4
    assert "run" in body
    assert "llm" in body


def test_pilot_prompt_tuning_test_agent_rejects_invalid_actions() -> None:
    response = client.post(
        "/agents/pilot/prompt-tuning/test-agent",
        json={
            "contract_version": "v1",
            "scenario_id": "pilot-002",
            "restaurant_name": "Sushi Go",
            "menu_item": "Spicy Tuna Roll",
            "target_audience": "young professionals",
            "tone": "premium",
            "objective": "traffic",
            "daypart": "evening",
            "price_band": "mid",
            "inventory_pressure": "medium",
            "brand_guardrails": [],
            "forbidden_phrases": [],
            "must_include_terms": [],
            "candidate_actions": [" "],
            "evidence_facts": ["Evening conversion increased by 12%"],
        },
    )
    assert response.status_code == 422
