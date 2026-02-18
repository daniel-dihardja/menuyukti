# Agent Prompt / Model Contract v1

## Purpose
Define a stable, versioned contract for per-agent prompt loading and run metadata in Phase 1.

## Runtime Fields
Each Phase 1 agent run must expose:

- `run.model` (compat alias)
- `run.model_id` (canonical)
- `run.prompt_version`
- `run.llm_provider`
- `run.llm_mode`
- `run.llm_status`
- `run.llm_latency_ms`

## Structured Envelope Requirement
All responses must include a structured envelope:

- `contract_version`
- `agent_id`
- `status`
- `reason_code`
- `run`
- `llm`

Free-form text may only appear inside typed sub-objects and must not replace structured fields.

## Prompt Contract Registry
Implementation reference: `apps/agents/src/agent/prompt_contracts.py`

Each prompt contract entry includes:

- `agent_id`
- `prompt_version`
- `system_prompt`
- `required_output_keys`

## Schema Enforcement Rule
During LLM execution:

1. parse provider output as JSON object
2. validate presence of `required_output_keys`
3. if validation fails, classify as `LLM_SCHEMA_INVALID`
4. apply deterministic fallback path

## Guardrail Reason-Code Catalog (v1)

LLM/runtime failure codes:

- `LLM_TIMEOUT`
- `LLM_SCHEMA_INVALID`
- `LLM_PROVIDER_ERROR`
- `LLM_FALLBACK_USED`
- `LLM_GUARDRAIL_BLOCKED`

Data/readiness codes (agent-level):

- `DATA_READINESS_BLOCKED`
- `DATA_READINESS_DEGRADED`

Behavior:

- `AGENTS_LLM_FAILURE_MODE=fallback`: keep structured payload and set LLM status to `fallback`.
- `AGENTS_LLM_FAILURE_MODE=blocked`: keep structured payload and set agent status to `blocked` with `LLM_GUARDRAIL_BLOCKED`.

## Phase 1 Agent Mapping (v1-draft)

- `marketer-strategist` -> `gpt-4o-mini` / `v1-draft`
- `menu-profit-intelligence` -> `gpt-4o-mini` / `v1-draft`
- `multi-agent-consensus` -> `gpt-4o-mini` / `v1-draft`
- `what-if-simulation` -> `gpt-4o-mini` / `v1-draft`
- `agent-memory-tracker` -> `gpt-4o-mini` / `v1-draft`
- `feedback-reranker` -> `gpt-4o-mini` / `v1-draft`
- `learning-release-loop` -> `gpt-4o-mini` / `v1-draft`

## Notes
- CI default uses mocked provider mode.
- Live-provider runs are executed in dedicated evaluation workflows.
