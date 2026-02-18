from __future__ import annotations

import json
import os
import re
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agent.evaluation_harness import EvaluationHarnessRequest, run_evaluation_harness
from agent.prompt_contracts import PROMPT_CONTRACTS


TUNING_LOOP_VERSION = "ast15-v1"
FREEZE_FILE = Path(__file__).resolve().parents[2] / "prompts" / "PROMPT_VERSION_FREEZE_V1.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_phase1_agents() -> list[str]:
    agents = {agent_id for (agent_id, _) in PROMPT_CONTRACTS.keys()}
    return sorted(agents)


def get_prompt_versions_for_agent(agent_id: str) -> list[str]:
    versions = {version for (candidate_agent, version) in PROMPT_CONTRACTS.keys() if candidate_agent == agent_id}
    return sorted(versions)


def _agent_env_key(agent_id: str) -> str:
    suffix = re.sub(r"[^A-Za-z0-9]+", "_", agent_id).upper()
    return f"AGENTS_PROMPT_VERSION_{suffix}"


@contextmanager
def _temporary_prompt_version(agent_id: str, prompt_version: str):
    env_key = _agent_env_key(agent_id)
    previous = os.getenv(env_key)
    try:
        os.environ[env_key] = prompt_version
        yield
    finally:
        if previous is None:
            os.environ.pop(env_key, None)
        else:
            os.environ[env_key] = previous


def _pick_best_version(results: list[dict[str, Any]]) -> str | None:
    if not results:
        return None
    sorted_results = sorted(
        results,
        key=lambda item: (
            bool(item.get("release_gate_passed")),
            float(item.get("pass_rate", 0)),
            float(item.get("avg_quality_score", 0)),
        ),
        reverse=True,
    )
    top = sorted_results[0]
    tie_candidates = [
        candidate
        for candidate in sorted_results
        if bool(candidate.get("release_gate_passed")) == bool(top.get("release_gate_passed"))
        and float(candidate.get("pass_rate", 0)) == float(top.get("pass_rate", 0))
        and float(candidate.get("avg_quality_score", 0)) == float(top.get("avg_quality_score", 0))
    ]
    tuned_candidate = next(
        (
            candidate
            for candidate in tie_candidates
            if str(candidate.get("prompt_version", "")).lower().endswith("-tuned")
        ),
        None,
    )
    best = tuned_candidate or top
    return str(best.get("prompt_version")) if best.get("prompt_version") else None


def run_prompt_tuning_loop(
    *,
    mode: str = "mock",
    agents: list[str] | None = None,
) -> dict[str, Any]:
    target_agents = agents if agents else get_phase1_agents()
    per_agent: list[dict[str, Any]] = []
    approved_versions: dict[str, str] = {}

    for agent_id in target_agents:
        versions = get_prompt_versions_for_agent(agent_id)
        evaluations: list[dict[str, Any]] = []
        for prompt_version in versions:
            with _temporary_prompt_version(agent_id, prompt_version):
                report = run_evaluation_harness(
                    EvaluationHarnessRequest(
                        contract_version="v1",
                        mode=mode,  # type: ignore[arg-type]
                        agents=[agent_id],
                        fail_fast=False,
                    )
                )
            result_rows = report.get("results", [])
            avg_quality_score = 0.0
            if isinstance(result_rows, list) and result_rows:
                avg_quality_score = round(
                    sum(float(row.get("quality_score", 0.0)) for row in result_rows) / len(result_rows),
                    3,
                )
            summary = report.get("summary", {})
            evaluations.append(
                {
                    "prompt_version": prompt_version,
                    "release_gate_passed": bool(summary.get("release_gate_passed")),
                    "pass_rate": float(summary.get("pass_rate", 0.0)),
                    "failed": int(summary.get("failed", 0)),
                    "avg_quality_score": avg_quality_score,
                }
            )
        approved = _pick_best_version(evaluations)
        if approved is not None:
            approved_versions[agent_id] = approved
        per_agent.append(
            {
                "agent_id": agent_id,
                "evaluations": evaluations,
                "approved_prompt_version": approved,
            }
        )

    return {
        "contract_version": "v1",
        "tuning_loop_version": TUNING_LOOP_VERSION,
        "mode": mode,
        "started_at": _utc_now(),
        "completed_at": _utc_now(),
        "agents": per_agent,
        "approved_prompt_versions": approved_versions,
    }


def write_prompt_freeze_map(approved_prompt_versions: dict[str, str]) -> Path:
    FREEZE_FILE.parent.mkdir(parents=True, exist_ok=True)
    FREEZE_FILE.write_text(
        json.dumps(approved_prompt_versions, indent=2) + "\n",
        encoding="utf-8",
    )
    return FREEZE_FILE
