from __future__ import annotations

import os
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field

from agent.consensus import DebateConsensusRequest, run_consensus
from agent.memory import MemoryContextRequest, build_memory_context
from agent.profit_intelligence import ProfitIntelligenceRequest, generate_action_board
from agent.release_loop import ReleaseLoopRequest, evaluate_release_loop
from agent.rerank import RerankRequest, rerank_recommendations
from agent.simulation import WhatIfSimulationRequest, run_what_if_simulation
from agent.strategist import StrategistWeeklyPlanRequest, generate_weekly_plan

EvaluationMode = Literal["mock", "live"]

HARNESS_VERSION = "ast12-v1"
QUALITY_THRESHOLD = 0.7


class EvaluationHarnessRequest(BaseModel):
    contract_version: Literal["v1"] = "v1"
    mode: EvaluationMode = "mock"
    agents: list[str] = Field(default_factory=list)
    fail_fast: bool = False


@dataclass(frozen=True)
class AgentEvaluationScenario:
    agent_id: str
    scenario_id: str
    payload: dict[str, Any]
    domain_path: tuple[str, ...]
    typed_list_paths: tuple[tuple[str, ...], ...]
    readability_paths: tuple[tuple[str, ...], ...]
    actionability_paths: tuple[tuple[str, ...], ...]
    runner: Any


def _run_strategist(payload: dict[str, Any]) -> dict[str, Any]:
    return generate_weekly_plan(StrategistWeeklyPlanRequest(**payload))


def _run_profit(payload: dict[str, Any]) -> dict[str, Any]:
    return generate_action_board(ProfitIntelligenceRequest(**payload))


def _run_consensus(payload: dict[str, Any]) -> dict[str, Any]:
    return run_consensus(DebateConsensusRequest(**payload))


def _run_simulation(payload: dict[str, Any]) -> dict[str, Any]:
    return run_what_if_simulation(WhatIfSimulationRequest(**payload))


def _run_memory(payload: dict[str, Any]) -> dict[str, Any]:
    return build_memory_context(MemoryContextRequest(**payload))


def _run_rerank(payload: dict[str, Any]) -> dict[str, Any]:
    return rerank_recommendations(RerankRequest(**payload))


def _run_release_loop(payload: dict[str, Any]) -> dict[str, Any]:
    return evaluate_release_loop(ReleaseLoopRequest(**payload))


SCENARIOS: tuple[AgentEvaluationScenario, ...] = (
    AgentEvaluationScenario(
        agent_id="marketer-strategist",
        scenario_id="weekly-plan-happy-path",
        payload={
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
                    "rationale": "Top conversion and repeat order trend",
                    "confidence": "high",
                }
            ],
        },
        domain_path=("plan",),
        typed_list_paths=(("plan", "priorities"),),
        readability_paths=(("plan", "headline"),),
        actionability_paths=(("plan", "priorities"),),
        runner=_run_strategist,
    ),
    AgentEvaluationScenario(
        agent_id="menu-profit-intelligence",
        scenario_id="action-board-happy-path",
        payload={
            "contract_version": "v1",
            "analytics_id": 1,
            "location_id": 1,
            "readiness": "ready",
            "cogs_readiness": "ready",
            "candidates": [
                {
                    "menu_item": "Ramen Bowl",
                    "matrix_action": "promote",
                    "margin_pct": 0.31,
                    "units_sold": 120,
                    "revenue": 1800,
                    "impact_score": 0.86,
                    "combo_supported": True,
                    "attribution_delta_revenue": 130,
                }
            ],
            "combo_signals": [],
        },
        domain_path=("board",),
        typed_list_paths=(("board", "recommendations"),),
        readability_paths=(("board", "headline"),),
        actionability_paths=(("board", "recommendations"),),
        runner=_run_profit,
    ),
    AgentEvaluationScenario(
        agent_id="multi-agent-consensus",
        scenario_id="debate-happy-path",
        payload={
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
                    "expected_revenue_delta": 110,
                    "expected_margin_delta": 35,
                    "risk_flags": [],
                }
            ],
        },
        domain_path=("consensus",),
        typed_list_paths=(("consensus", "recommendations"),),
        readability_paths=(("consensus", "winner", "menu_item"),),
        actionability_paths=(("consensus", "recommendations"),),
        runner=_run_consensus,
    ),
    AgentEvaluationScenario(
        agent_id="what-if-simulation",
        scenario_id="simulation-happy-path",
        payload={
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
        domain_path=("simulation",),
        typed_list_paths=(("simulation", "ranked_scenarios"),),
        readability_paths=(("simulation", "winner", "name"),),
        actionability_paths=(("simulation", "ranked_scenarios"),),
        runner=_run_simulation,
    ),
    AgentEvaluationScenario(
        agent_id="agent-memory-tracker",
        scenario_id="memory-happy-path",
        payload={
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
        domain_path=("memory_context",),
        typed_list_paths=(("memory_context", "recent_events"),),
        readability_paths=(("memory_context", "continuity_signal"),),
        actionability_paths=(("memory_context", "recent_events"),),
        runner=_run_memory,
    ),
    AgentEvaluationScenario(
        agent_id="feedback-reranker",
        scenario_id="rerank-happy-path",
        payload={
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
        domain_path=(),
        typed_list_paths=(("recommendations",),),
        readability_paths=(("policy_version",),),
        actionability_paths=(("recommendations",),),
        runner=_run_rerank,
    ),
    AgentEvaluationScenario(
        agent_id="learning-release-loop",
        scenario_id="release-loop-shadow-pass",
        payload={
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
        domain_path=("release_decision",),
        typed_list_paths=(),
        readability_paths=(("release_decision", "decision"),),
        actionability_paths=(("release_decision", "decision"),),
        runner=_run_release_loop,
    ),
)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_path(data: dict[str, Any], path: tuple[str, ...]) -> Any:
    current: Any = data
    for key in path:
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def _is_non_empty_string(value: Any) -> bool:
    return isinstance(value, str) and value.strip() != ""


def _has_actionable_value(value: Any) -> bool:
    if isinstance(value, list):
        return len(value) > 0
    if isinstance(value, dict):
        return len(value) > 0
    return _is_non_empty_string(value)


def _evaluate_response(scenario: AgentEvaluationScenario, response: dict[str, Any]) -> dict[str, Any]:
    required_top_level_fields = ("contract_version", "agent_id", "status", "reason_code", "run", "llm")
    checks: dict[str, bool] = {
        "envelope_is_object": isinstance(response, dict),
        "required_top_level_fields": all(field in response for field in required_top_level_fields),
        "run_fields_present": False,
        "llm_fields_present": False,
        "domain_payload_present": False,
        "domain_payload_typed": True,
        "structured_envelope_only": False,
        "fallback_consistency": True,
        "readability": False,
        "actionability": False,
    }
    errors: list[str] = []

    if not checks["envelope_is_object"]:
        errors.append("response_not_object")
        checks["domain_payload_typed"] = False
        checks["structured_envelope_only"] = False
        checks["fallback_consistency"] = False
        quality_score = 0.0
        return {"checks": checks, "errors": errors, "quality_score": quality_score}

    run = response.get("run")
    llm = response.get("llm")
    checks["run_fields_present"] = isinstance(run, dict) and all(
        _is_non_empty_string(run.get(key))
        for key in ("run_id", "model_id", "prompt_version", "llm_provider", "llm_mode", "llm_status")
    )
    checks["llm_fields_present"] = isinstance(llm, dict) and all(
        _is_non_empty_string(llm.get(key)) for key in ("status", "provider", "mode", "prompt_version", "model_id")
    )

    if scenario.domain_path:
        domain_value = _get_path(response, scenario.domain_path)
        checks["domain_payload_present"] = isinstance(domain_value, dict)
    else:
        checks["domain_payload_present"] = True

    for typed_path in scenario.typed_list_paths:
        typed_value = _get_path(response, typed_path)
        if not isinstance(typed_value, list):
            checks["domain_payload_typed"] = False
            errors.append(f"typed_path_not_list:{'.'.join(typed_path)}")

    checks["structured_envelope_only"] = checks["required_top_level_fields"] and (
        checks["domain_payload_present"] or checks["domain_payload_typed"]
    )

    llm_status = llm.get("status") if isinstance(llm, dict) else None
    status = response.get("status")
    if llm_status == "fallback" and status == "accepted":
        checks["fallback_consistency"] = False
        errors.append("fallback_without_degraded_status")

    checks["readability"] = any(
        _is_non_empty_string(_get_path(response, path))
        for path in scenario.readability_paths
    )
    checks["actionability"] = any(
        _has_actionable_value(_get_path(response, path))
        for path in scenario.actionability_paths
    )

    quality_dimensions = [checks["readability"], checks["actionability"]]
    quality_score = round(sum(1.0 for item in quality_dimensions if item) / max(1, len(quality_dimensions)), 3)
    return {"checks": checks, "errors": errors, "quality_score": quality_score}


@contextmanager
def _temporary_llm_mode(mode: EvaluationMode):
    keys = ["AGENTS_LLM_ENABLED", "AGENTS_LLM_PROVIDER"]
    previous = {key: os.getenv(key) for key in keys}
    try:
        os.environ["AGENTS_LLM_ENABLED"] = "1"
        os.environ["AGENTS_LLM_PROVIDER"] = "openai" if mode == "live" else "mock"
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def _pick_scenarios(selected_agents: list[str]) -> list[AgentEvaluationScenario]:
    if not selected_agents:
        return list(SCENARIOS)
    selected = set(selected_agents)
    return [scenario for scenario in SCENARIOS if scenario.agent_id in selected]


def run_evaluation_harness(request: EvaluationHarnessRequest) -> dict[str, Any]:
    started_at = _utc_now()
    scenarios = _pick_scenarios(request.agents)
    provider_readiness = "ready"
    provider_reason = None
    if request.mode == "live" and not os.getenv("OPENAI_API_KEY"):
        provider_readiness = "blocked"
        provider_reason = "OPENAI_API_KEY_MISSING_FOR_LIVE_EVALUATION"

    results: list[dict[str, Any]] = []
    with _temporary_llm_mode(request.mode):
        for scenario in scenarios:
            if provider_readiness == "blocked":
                results.append(
                    {
                        "agent_id": scenario.agent_id,
                        "scenario_id": scenario.scenario_id,
                        "prompt_version": None,
                        "model_id": None,
                        "status": "blocked",
                        "reason_code": provider_reason,
                        "llm_status": "blocked",
                        "checks": {
                            "envelope_is_object": False,
                            "required_top_level_fields": False,
                            "run_fields_present": False,
                            "llm_fields_present": False,
                            "domain_payload_present": False,
                            "domain_payload_typed": False,
                            "structured_envelope_only": False,
                            "fallback_consistency": False,
                            "readability": False,
                            "actionability": False,
                        },
                        "quality_score": 0.0,
                        "passed": False,
                        "errors": [provider_reason],
                    }
                )
                if request.fail_fast:
                    break
                continue

            try:
                response = scenario.runner(scenario.payload)
                evaluation = _evaluate_response(scenario, response)
                run = response.get("run") if isinstance(response, dict) else None
                llm = response.get("llm") if isinstance(response, dict) else None
                critical_checks = (
                    evaluation["checks"]["required_top_level_fields"]
                    and evaluation["checks"]["run_fields_present"]
                    and evaluation["checks"]["llm_fields_present"]
                    and evaluation["checks"]["structured_envelope_only"]
                    and evaluation["checks"]["domain_payload_typed"]
                    and evaluation["checks"]["fallback_consistency"]
                )
                passed = bool(critical_checks and evaluation["quality_score"] >= QUALITY_THRESHOLD)
                item = {
                    "agent_id": scenario.agent_id,
                    "scenario_id": scenario.scenario_id,
                    "prompt_version": run.get("prompt_version") if isinstance(run, dict) else None,
                    "model_id": run.get("model_id") if isinstance(run, dict) else None,
                    "status": response.get("status") if isinstance(response, dict) else "invalid",
                    "reason_code": response.get("reason_code") if isinstance(response, dict) else "INVALID_RESPONSE",
                    "llm_status": llm.get("status") if isinstance(llm, dict) else "missing",
                    "checks": evaluation["checks"],
                    "quality_score": evaluation["quality_score"],
                    "passed": passed,
                    "errors": evaluation["errors"],
                }
                results.append(item)
                if request.fail_fast and not passed:
                    break
            except Exception as error:  # noqa: BLE001
                results.append(
                    {
                        "agent_id": scenario.agent_id,
                        "scenario_id": scenario.scenario_id,
                        "prompt_version": None,
                        "model_id": None,
                        "status": "blocked",
                        "reason_code": "HARNESS_EXECUTION_ERROR",
                        "llm_status": "missing",
                        "checks": {
                            "envelope_is_object": False,
                            "required_top_level_fields": False,
                            "run_fields_present": False,
                            "llm_fields_present": False,
                            "domain_payload_present": False,
                            "domain_payload_typed": False,
                            "structured_envelope_only": False,
                            "fallback_consistency": False,
                            "readability": False,
                            "actionability": False,
                        },
                        "quality_score": 0.0,
                        "passed": False,
                        "errors": [str(error)],
                    }
                )
                if request.fail_fast:
                    break

    total = len(results)
    passed_count = sum(1 for result in results if result["passed"])
    failed_count = total - passed_count
    pass_rate = round((passed_count / total) if total else 0.0, 3)

    return {
        "contract_version": request.contract_version,
        "harness_version": HARNESS_VERSION,
        "mode": request.mode,
        "started_at": started_at,
        "finished_at": _utc_now(),
        "thresholds": {
            "quality_score_min": QUALITY_THRESHOLD,
        },
        "summary": {
            "total": total,
            "passed": passed_count,
            "failed": failed_count,
            "pass_rate": pass_rate,
            "release_gate_passed": failed_count == 0,
        },
        "results": results,
    }
