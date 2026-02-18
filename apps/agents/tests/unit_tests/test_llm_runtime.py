from __future__ import annotations

from agent.llm_runtime import (
    LLM_ERROR_FALLBACK_USED,
    LLM_ERROR_GUARDRAIL_BLOCKED,
    LlmExecutionResult,
    get_llm_failure_mode,
    resolve_agent_status,
)


def test_get_llm_failure_mode_defaults_to_fallback(monkeypatch) -> None:
    monkeypatch.delenv("AGENTS_LLM_FAILURE_MODE", raising=False)
    assert get_llm_failure_mode() == "fallback"


def test_get_llm_failure_mode_supports_blocked(monkeypatch) -> None:
    monkeypatch.setenv("AGENTS_LLM_FAILURE_MODE", "blocked")
    assert get_llm_failure_mode() == "blocked"


def test_resolve_agent_status_downgrades_on_fallback() -> None:
    llm = LlmExecutionResult(
        status="fallback",
        provider="mock",
        mode="deterministic",
        prompt_version="v1-draft",
        model_id="gpt-4o-mini",
        latency_ms=12,
        output=None,
    )
    status, reason = resolve_agent_status(base_status="accepted", base_reason_code="ALLOWED", llm=llm)
    assert status == "degraded"
    assert reason == LLM_ERROR_FALLBACK_USED


def test_resolve_agent_status_blocks_on_guardrail_blocked() -> None:
    llm = LlmExecutionResult(
        status="blocked",
        provider="mock",
        mode="deterministic",
        prompt_version="v1-draft",
        model_id="gpt-4o-mini",
        latency_ms=12,
        output=None,
        error_code="LLM_PROVIDER_ERROR",
    )
    status, reason = resolve_agent_status(base_status="accepted", base_reason_code="ALLOWED", llm=llm)
    assert status == "blocked"
    assert reason == LLM_ERROR_GUARDRAIL_BLOCKED
