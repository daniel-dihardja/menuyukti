from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from agent.api import app


client = TestClient(app)


@pytest.mark.parametrize(
    ("endpoint", "payload"),
    [
        (
            "/agents/strategist/weekly-plan",
            {
                "contract_version": "v1",
                "analytics_id": 1,
                "location_id": 1,
                "week_start_date": "2026-02-18",
                "readiness": "ready",
                "suggestions": [],
            },
        ),
        (
            "/agents/profit-intelligence/action-board",
            {
                "contract_version": "v1",
                "analytics_id": 1,
                "location_id": 1,
                "readiness": "ready",
                "cogs_readiness": "ready",
                "candidates": [],
                "combo_signals": [],
            },
        ),
        (
            "/agents/consensus/debate",
            {
                "contract_version": "v1",
                "analytics_id": 1,
                "location_id": 1,
                "readiness": "ready",
                "mode": "conservative",
                "candidates": [],
            },
        ),
        (
            "/agents/simulation/what-if",
            {
                "contract_version": "v1",
                "analytics_id": 1,
                "location_id": 1,
                "readiness": "ready",
                "baseline": {"weekly_posts": 4, "avg_margin_pct": 0.3, "avg_revenue_per_post": 100},
                "scenarios": [],
            },
        ),
        (
            "/agents/memory/context",
            {
                "contract_version": "v1",
                "location_id": 1,
                "analytics_id": 1,
                "events": [],
            },
        ),
        (
            "/agents/rerank/recommendations",
            {
                "contract_version": "v1",
                "policy_version": "as10-v1",
                "min_signal_count": 1,
                "baseline": [],
                "priors": [],
            },
        ),
        (
            "/agents/learning/release-loop/evaluate",
            {
                "contract_version": "v1",
                "stage": "shadow",
                "candidate_policy_version": "v2",
                "baseline_policy_version": "v1",
                "metrics": {
                    "shadow_quality_score": 0.8,
                    "shadow_contract_pass_rate": 0.99,
                    "canary_error_rate": 0.01,
                    "canary_regression_rate": 0.02,
                },
            },
        ),
    ],
)
def test_phase1_agents_expose_llm_run_metadata(endpoint: str, payload: dict, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.delenv("AGENTS_LLM_MOCK_BEHAVIOR", raising=False)

    response = client.post(endpoint, json=payload)
    assert response.status_code == 200
    body = response.json()

    run = body.get("run")
    assert isinstance(run, dict)
    assert isinstance(run.get("run_id"), str)
    assert isinstance(run.get("model"), str)
    assert isinstance(run.get("model_id"), str)
    assert isinstance(run.get("prompt_version"), str)
    assert run.get("llm_status") in {"used", "skipped", "fallback", "disabled"}

    llm = body.get("llm")
    assert isinstance(llm, dict)
    assert llm.get("prompt_version") == run.get("prompt_version")
    assert llm.get("model_id") == run.get("model_id")


def test_llm_provider_failure_falls_back_to_deterministic(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.setenv("AGENTS_LLM_MOCK_BEHAVIOR", "error")

    response = client.post(
        "/agents/strategist/weekly-plan",
        json={
            "contract_version": "v1",
            "analytics_id": 12,
            "location_id": 7,
            "week_start_date": "2026-02-16",
            "readiness": "ready",
            "suggestions": [],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"accepted", "degraded"}
    assert body["llm"]["status"] == "fallback"
    assert body["llm"]["error_code"] == "LLM_PROVIDER_ERROR"


def test_llm_disabled_mode_keeps_agent_available(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "0")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.delenv("AGENTS_LLM_MOCK_BEHAVIOR", raising=False)

    response = client.post(
        "/agents/profit-intelligence/action-board",
        json={
            "contract_version": "v1",
            "analytics_id": 20,
            "location_id": 3,
            "readiness": "ready",
            "cogs_readiness": "ready",
            "candidates": [],
            "combo_signals": [],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["llm"]["status"] == "disabled"
