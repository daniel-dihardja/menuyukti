from __future__ import annotations

from copy import deepcopy
from typing import Any

import pytest
from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


Case = dict[str, Any]


CASES: dict[str, Case] = {
    "marketer-strategist": {
        "path": "/agents/strategist/weekly-plan",
        "domain_path": ("plan",),
        "payload": {
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "week_start_date": "2026-02-18",
            "readiness": "ready",
            "suggestions": [
                {
                    "rank": 1,
                    "menu_item": "Truffle Burger",
                    "suggested_for": "Lunch crowd",
                    "suggested_daypart": "lunch",
                    "offer_type": "hero_item",
                    "rationale": "Top performer",
                    "confidence": "high",
                }
            ],
        },
        "malformed_field": "analytics_id",
    },
    "menu-profit-intelligence": {
        "path": "/agents/profit-intelligence/action-board",
        "domain_path": ("board",),
        "payload": {
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "cogs_readiness": "ready",
            "candidates": [
                {
                    "menu_item": "Ramen Bowl",
                    "matrix_action": "promote",
                    "margin_pct": 0.32,
                    "units_sold": 120,
                    "revenue": 1600,
                    "impact_score": 0.89,
                    "combo_supported": True,
                    "attribution_delta_revenue": 90,
                }
            ],
            "combo_signals": [],
        },
        "malformed_field": "analytics_id",
    },
    "multi-agent-consensus": {
        "path": "/agents/consensus/debate",
        "domain_path": ("consensus",),
        "payload": {
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "mode": "conservative",
            "candidates": [
                {
                    "rank": 1,
                    "menu_item": "Ramen Bowl",
                    "action": "promote",
                    "confidence": "high",
                    "expected_revenue_delta": 120,
                    "expected_margin_delta": 30,
                    "risk_flags": [],
                }
            ],
        },
        "malformed_field": "analytics_id",
    },
    "what-if-simulation": {
        "path": "/agents/simulation/what-if",
        "domain_path": ("simulation",),
        "payload": {
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "baseline": {"weekly_posts": 4, "avg_margin_pct": 0.3, "avg_revenue_per_post": 100},
            "scenarios": [
                {
                    "scenario_id": "s1",
                    "name": "Evening Hero Push",
                    "cadence_multiplier": 1.2,
                    "item_focus_multiplier": 1.1,
                    "bundle_multiplier": 0.4,
                    "constraint_penalty": 0.1,
                    "assumptions": ["stable demand"],
                }
            ],
        },
        "malformed_field": "baseline",
    },
    "agent-memory-tracker": {
        "path": "/agents/memory/context",
        "domain_path": ("memory_context",),
        "payload": {
            "contract_version": "v1",
            "location_id": 1,
            "analytics_id": 1,
            "events": [
                {
                    "id": "mem-1",
                    "version": 1,
                    "recommendation_id": "rec-1",
                    "source_agent_id": "menu-profit-intelligence",
                    "state": "accepted",
                    "created_at": "2026-02-18T00:00:00.000Z",
                }
            ],
        },
        "malformed_field": "location_id",
    },
    "feedback-reranker": {
        "path": "/agents/rerank/recommendations",
        "domain_path": ("recommendations",),
        "payload": {
            "contract_version": "v1",
            "policy_version": "as10-v1",
            "min_signal_count": 1,
            "baseline": [
                {
                    "recommendation_id": "rec-1",
                    "rank": 1,
                    "menu_item": "Ramen Bowl",
                    "action": "promote",
                    "baseline_score": 0.6,
                }
            ],
            "priors": [
                {
                    "recommendation_id": "rec-1",
                    "sample_size": 12,
                    "success_rate": 0.72,
                    "avg_delta_revenue": 110,
                }
            ],
        },
        "malformed_field": "baseline",
    },
    "learning-release-loop": {
        "path": "/agents/learning/release-loop/evaluate",
        "domain_path": ("release_decision",),
        "payload": {
            "contract_version": "v1",
            "stage": "shadow",
            "candidate_policy_version": "as10-v2",
            "baseline_policy_version": "as10-v1",
            "metrics": {
                "shadow_quality_score": 0.8,
                "shadow_contract_pass_rate": 0.99,
                "canary_error_rate": 0.01,
                "canary_regression_rate": 0.02,
            },
        },
        "malformed_field": "metrics",
    },
}


def _get_path(data: dict[str, Any], path: tuple[str, ...]) -> Any:
    current: Any = data
    for key in path:
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def _assert_structured_envelope(body: dict[str, Any]) -> None:
    for key in ("contract_version", "agent_id", "status", "reason_code", "run", "llm"):
        assert key in body
    assert isinstance(body["run"], dict)
    assert isinstance(body["llm"], dict)
    assert isinstance(body["run"].get("model_id"), str)
    assert isinstance(body["run"].get("prompt_version"), str)
    assert isinstance(body["llm"].get("status"), str)


@pytest.mark.parametrize("agent_id", list(CASES.keys()))
def test_mocked_baseline_happy_path_per_agent(agent_id: str, monkeypatch: pytest.MonkeyPatch) -> None:
    case = CASES[agent_id]
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.setenv("AGENTS_LLM_FAILURE_MODE", "fallback")
    monkeypatch.delenv("AGENTS_LLM_MOCK_BEHAVIOR", raising=False)
    monkeypatch.delenv("AGENTS_LLM_MOCK_RESPONSE", raising=False)

    response = client.post(case["path"], json=case["payload"])
    assert response.status_code == 200
    body = response.json()

    _assert_structured_envelope(body)
    assert body["agent_id"] == agent_id
    assert body["status"] in {"accepted", "degraded"}
    assert isinstance(_get_path(body, case["domain_path"]), (dict, list))


@pytest.mark.parametrize("agent_id", list(CASES.keys()))
def test_mocked_baseline_low_readiness_or_low_signal_per_agent(agent_id: str, monkeypatch: pytest.MonkeyPatch) -> None:
    case = deepcopy(CASES[agent_id])
    payload = case["payload"]
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.setenv("AGENTS_LLM_FAILURE_MODE", "fallback")
    monkeypatch.delenv("AGENTS_LLM_MOCK_BEHAVIOR", raising=False)

    if "readiness" in payload:
        payload["readiness"] = "degraded"
    elif agent_id == "feedback-reranker":
        payload["min_signal_count"] = 99
        payload["priors"] = []
    elif agent_id == "agent-memory-tracker":
        payload["events"] = []
    elif agent_id == "learning-release-loop":
        payload["metrics"]["shadow_quality_score"] = 0.2
        payload["metrics"]["shadow_contract_pass_rate"] = 0.2

    response = client.post(case["path"], json=payload)
    assert response.status_code == 200
    body = response.json()

    _assert_structured_envelope(body)
    assert body["agent_id"] == agent_id
    if "readiness" in case["payload"]:
        assert body["status"] == "degraded"
    assert isinstance(_get_path(body, case["domain_path"]), (dict, list))


@pytest.mark.parametrize("agent_id", list(CASES.keys()))
def test_mocked_baseline_blocked_guardrail_per_agent(agent_id: str, monkeypatch: pytest.MonkeyPatch) -> None:
    case = CASES[agent_id]
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.setenv("AGENTS_LLM_FAILURE_MODE", "blocked")
    monkeypatch.setenv("AGENTS_LLM_MOCK_BEHAVIOR", "error")

    response = client.post(case["path"], json=case["payload"])
    assert response.status_code == 200
    body = response.json()

    _assert_structured_envelope(body)
    assert body["status"] == "blocked"
    assert body["reason_code"] == "LLM_GUARDRAIL_BLOCKED"
    assert body["llm"]["status"] == "blocked"
    assert body["llm"]["error_code"] == "LLM_PROVIDER_ERROR"


@pytest.mark.parametrize("agent_id", list(CASES.keys()))
def test_mocked_baseline_provider_failure_fallback_per_agent(agent_id: str, monkeypatch: pytest.MonkeyPatch) -> None:
    case = CASES[agent_id]
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.setenv("AGENTS_LLM_FAILURE_MODE", "fallback")
    monkeypatch.setenv("AGENTS_LLM_MOCK_BEHAVIOR", "error")

    response = client.post(case["path"], json=case["payload"])
    assert response.status_code == 200
    body = response.json()

    _assert_structured_envelope(body)
    assert body["status"] == "degraded"
    assert body["reason_code"] == "LLM_FALLBACK_USED"
    assert body["llm"]["status"] == "fallback"
    assert body["llm"]["error_code"] == "LLM_PROVIDER_ERROR"
    assert isinstance(_get_path(body, case["domain_path"]), (dict, list))


@pytest.mark.parametrize("agent_id", list(CASES.keys()))
def test_mocked_baseline_malformed_context_per_agent(agent_id: str) -> None:
    case = deepcopy(CASES[agent_id])
    payload = case["payload"]
    if agent_id == "feedback-reranker":
        payload["baseline"] = [
            {
                "rank": 1,
                "menu_item": "Ramen Bowl",
                "action": "promote",
                "baseline_score": 0.6,
            }
        ]
    else:
        payload.pop(case["malformed_field"], None)

    response = client.post(case["path"], json=payload)
    assert response.status_code == 422
    body = response.json()
    assert "detail" in body
