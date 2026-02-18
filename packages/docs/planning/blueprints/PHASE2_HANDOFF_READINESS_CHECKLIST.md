# Phase 2 Handoff Readiness Checklist

## Context

- Epic (Phase 1): `EPIC-AGENT-STUDIO-EXPLORATION-LAB`
- Handoff target: next epic(s) after Phase 1, including but not limited to multi-agent interaction/orchestration.
- Intent: verify Phase 1 is stable and scoped before any Phase 2 work starts.

## Decision Summary

- Handoff decision: `GO` / `NO-GO`
- Decision date: `YYYY-MM-DD`
- Product sign-off: `<name>`
- Engineering sign-off: `<name>`

## Mandatory Gate Checklist

### 1) Phase 1 Story Completion

- [ ] AST-01 through AST-13 are implemented and archived in `packages/docs/planning/archive/EPIC-AGENT-STUDIO-EXPLORATION-LAB/`.
- [ ] Remaining Phase 1 stories in `todo/` are explicitly accepted risk, deferred, or completed.

### 2) Structured Contract Stability

- [ ] All Phase 1 agents return stable structured envelope fields:
  - `contract_version`, `agent_id`, `status`, `reason_code`, `run`, `llm`.
- [ ] Typed domain payloads are present and machine-parseable for every phase-1 agent surface.
- [ ] Normal, degraded, blocked, fallback, and mechanical modes preserve contract shape.

Evidence:
- `apps/agents/tests/integration_tests/test_trust_contract_fields.py`
- `apps/agents/tests/integration_tests/test_llm_runtime_integration.py`
- `apps/agents/tests/integration_tests/test_mocked_input_baseline_per_agent.py`

### 3) Mocked Baseline Integration Coverage

- [ ] Per-agent mocked baseline suite passes for all Phase 1 agents.
- [ ] Scenarios covered per agent:
  - happy path
  - low-readiness / low-signal
  - blocked/guardrail
  - provider failure fallback
  - malformed context

Evidence:
- `apps/agents/tests/integration_tests/test_mocked_input_baseline_per_agent.py`
- gate command: `make -C apps/agents mocked_baseline_tests`

### 4) LLM Runtime + Guardrail Policy

- [ ] LLM runtime is configurable and stable by env policy.
- [ ] Fallback/blocked behavior is deterministic and explicit.
- [ ] Mechanical mode (`AGENTS_LLM_ENABLED=false`) is available for non-live regression loops.

Evidence:
- `apps/agents/src/agent/llm_runtime.py`
- `apps/agents/tests/unit_tests/test_llm_runtime.py`
- `apps/agents/tests/integration_tests/test_llm_runtime_integration.py`

### 5) Prompt/Model Versioning + Evaluation Harness

- [ ] Prompt/model contract versions are surfaced in run metadata.
- [ ] Evaluation harness exists and can run in both `mock` and `live` mode.
- [ ] Quality threshold and pass/fail summary are available for release review.

Evidence:
- `apps/agents/src/agent/prompt_contracts.py`
- `apps/agents/src/agent/evaluation_harness.py`
- `apps/agents/scripts/run_llm_evaluation_harness.py`
- `packages/docs/contracts/AGENT_PROMPT_MODEL_CONTRACT_V1.md`
- `packages/docs/contracts/AGENT_LLM_EVALUATION_HARNESS_V1.md`

### 6) Agent Studio Surface Stability

- [ ] Agent overview and per-agent pages are reachable and render expected trust metadata.
- [ ] Sample/selected context run flows are stable for Phase 1 agents.
- [ ] Run history/comparison/trust panels remain functional.

Evidence:
- `apps/web/e2e/agent-studio-overview-sandbox.e2e.ts`
- `apps/web/e2e/agent-sample-context-runner.e2e.ts`
- `apps/web/e2e/agent-selected-context-runner.e2e.ts`
- `apps/web/e2e/agent-output-trust-panel.e2e.ts`
- `apps/web/e2e/agent-run-history.e2e.ts`
- `apps/web/e2e/agent-run-comparison.e2e.ts`

### 7) No Phase 2 Scope Leakage

- [ ] No Phase-2 orchestration routes/pages are introduced in this epic.
- [ ] Story-level E2E check validates Phase-2 placeholder routes are absent.

Evidence:
- `apps/web/e2e/agent-phase2-handoff-readiness.e2e.ts`

### 8) Rollout/Fallback References for Next Epic Consumers

- [ ] Rollout policy references are documented and discoverable.
- [ ] Fallback policy references are documented and discoverable.

References:
- `apps/agents/README.md`
- `packages/docs/contracts/AGENT_PROMPT_MODEL_CONTRACT_V1.md`
- `packages/docs/contracts/AGENT_LLM_EVALUATION_HARNESS_V1.md`
- `packages/docs/manual/13-agent-llm-evaluation-harness.md`

## Known Risks / Deferred Items

- List unresolved risks accepted for handoff:
  - `<risk 1>`
  - `<risk 2>`

## Handoff Notes for Next Epic Owner

- Reuse Phase 1 gates before enabling any cross-agent orchestration.
- Keep Phase 2 feature flags explicit and default-off until equivalent guardrails/E2E gates exist.
