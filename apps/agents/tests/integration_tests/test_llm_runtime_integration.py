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
            "suggestions": [
                {
                    "rank": 1,
                    "menu_item": "Burger",
                    "suggested_for": "lunch",
                    "suggested_daypart": "lunch",
                    "offer_type": "hero_item",
                    "rationale": "Top performer with repeat demand",
                    "confidence": "high",
                },
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "degraded"
    assert body["reason_code"] == "LLM_FALLBACK_USED"
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


def test_llm_schema_invalid_triggers_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.setenv("AGENTS_LLM_MOCK_RESPONSE", '{"unexpected":"shape"}')

    response = client.post(
        "/agents/learning/release-loop/evaluate",
        json={
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
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "degraded"
    assert body["reason_code"] == "LLM_FALLBACK_USED"
    assert body["llm"]["status"] == "fallback"
    assert body["llm"]["error_code"] == "LLM_SCHEMA_INVALID"


def test_llm_failure_mode_blocked_returns_blocked_status(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.setenv("AGENTS_LLM_MOCK_BEHAVIOR", "error")
    monkeypatch.setenv("AGENTS_LLM_FAILURE_MODE", "blocked")

    response = client.post(
        "/agents/profit-intelligence/action-board",
        json={
            "contract_version": "v1",
            "analytics_id": 12,
            "location_id": 7,
            "readiness": "ready",
            "cogs_readiness": "ready",
            "candidates": [
                {
                    "menu_item": "Pizza",
                    "matrix_action": "promote",
                    "margin_pct": 0.32,
                    "units_sold": 120,
                    "revenue": 1600,
                    "impact_score": 0.89,
                    "combo_supported": True,
                    "attribution_delta_revenue": 90,
                },
            ],
            "combo_signals": [],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "blocked"
    assert body["reason_code"] == "LLM_GUARDRAIL_BLOCKED"
    assert body["llm"]["status"] == "blocked"
    assert body["llm"]["error_code"] == "LLM_PROVIDER_ERROR"


def test_degraded_readiness_returns_degraded_reason_code(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.delenv("AGENTS_LLM_MOCK_BEHAVIOR", raising=False)

    response = client.post(
        "/agents/simulation/what-if",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "degraded",
            "baseline": {"weekly_posts": 4, "avg_margin_pct": 0.3, "avg_revenue_per_post": 100},
            "scenarios": [
                {
                    "scenario_id": "s1",
                    "name": "extra evening push",
                    "cadence_multiplier": 1.3,
                    "item_focus_multiplier": 1.1,
                    "bundle_multiplier": 0.5,
                    "constraint_penalty": 0.1,
                    "assumptions": [],
                },
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "degraded"
    assert body["reason_code"] == "DATA_READINESS_DEGRADED"
    assert "simulation" in body
    assert isinstance(body["simulation"]["ranked_scenarios"], list)


def test_prompt_version_override_is_applied(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.setenv("AGENTS_PROMPT_VERSION_MARKETER_STRATEGIST", "v1-alt")
    monkeypatch.delenv("AGENTS_LLM_MOCK_RESPONSE", raising=False)

    response = client.post(
        "/agents/strategist/weekly-plan",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "week_start_date": "2026-02-18",
            "readiness": "ready",
            "suggestions": [],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["run"]["prompt_version"] == "v1-alt"
    assert body["llm"]["prompt_version"] == "v1-alt"


def test_model_id_override_is_applied(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_ENABLED", "1")
    monkeypatch.setenv("AGENTS_LLM_PROVIDER", "mock")
    monkeypatch.setenv("AGENTS_MODEL_ID_WHAT_IF_SIMULATION", "gpt-4.1-mini")
    monkeypatch.delenv("AGENTS_LLM_MOCK_RESPONSE", raising=False)

    response = client.post(
        "/agents/simulation/what-if",
        json={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "baseline": {"weekly_posts": 4, "avg_margin_pct": 0.3, "avg_revenue_per_post": 100},
            "scenarios": [],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["run"]["model_id"] == "gpt-4.1-mini"
    assert body["llm"]["model_id"] == "gpt-4.1-mini"
