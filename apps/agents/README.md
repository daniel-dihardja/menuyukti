# Menuyukti Agents Service

FastAPI service for Menuyukti's AI-agentic workflows. This app provides deterministic, contract-first agent endpoints used by the web app.

## Run

From repo root:

```bash
uv run --project apps/agents uvicorn agent.api:app --app-dir apps/agents/src --host 127.0.0.1 --port 8001
```

Docs:

- `http://127.0.0.1:8001/docs`

## Test

Run all integration tests:

```bash
uv run --project apps/agents pytest apps/agents/tests/integration_tests
```

Run one test file:

```bash
uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_api.py
```

## Current Endpoints

General contract/policy:

- `POST /tools/invoke`

Agent workflows:

- `POST /agents/strategist/weekly-plan`
- `POST /agents/profit-intelligence/action-board`
- `POST /agents/consensus/debate`
- `POST /agents/simulation/what-if`
- `POST /agents/memory/context`
- `POST /agents/learning/eligibility`
- `POST /agents/rerank/recommendations`
- `POST /agents/learning/release-loop/evaluate`

## Design Principles

- Contract-first responses (`v1`) for stable web integration.
- LLM runtime with deterministic fallback for repeatable tests and rollout safety.
- Policy/guardrail checks before action execution.
- Explainability-ready payloads for evidence, confidence, and rollback decisions.

## Source Layout

- `apps/agents/src/agent/api.py`: FastAPI router and endpoint wiring.
- `apps/agents/src/agent/*.py`: agent logic modules.
- `apps/agents/src/agent/runtime_config.py`: per-agent model/prompt runtime mapping.
- `apps/agents/src/agent/prompt_contracts.py`: prompt contract registry + required output keys.
- `apps/agents/prompts/**`: versioned prompt template files.
- `apps/agents/tests/integration_tests/*.py`: integration coverage by story/capability.

## Notes

- Runtime defaults:
  - `AGENTS_LLM_ENABLED=true`
  - `AGENTS_LLM_PROVIDER=mock`
- Set `AGENTS_LLM_PROVIDER=openai` with `OPENAI_API_KEY` to run live provider mode.
- Optional per-agent runtime overrides:
  - `AGENTS_MODEL_ID_<AGENT_ID_NORMALIZED>`
  - `AGENTS_PROMPT_VERSION_<AGENT_ID_NORMALIZED>`
