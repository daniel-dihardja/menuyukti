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

Run mandatory mocked-baseline integration gate (Phase 1 agents):

```bash
make -C apps/agents mocked_baseline_tests
```

Run LLM evaluation harness (mock mode):

```bash
uv run --project apps/agents python apps/agents/scripts/run_llm_evaluation_harness.py --mode mock --fail-on-fail
```

What this does:
- Executes a fixed scenario set against the selected agents.
- Uses mocked LLM behavior (`--mode mock`) so results are deterministic and CI-safe.
- Validates contract shape, trust metadata, and pass/fail outcomes per scenario.
- Writes a report JSON to:
  - `apps/agents/eval-artifacts/llm-evaluation-latest.json`
- Exits with non-zero when any scenario fails (because of `--fail-on-fail`).

Example scenario:
- You changed `marketer-strategist` prompt mapping and want to ensure no regression.
- Run:
  - `uv run --project apps/agents python apps/agents/scripts/run_llm_evaluation_harness.py --mode mock --agent marketer-strategist --fail-on-fail`
- Expected result:
  - console summary like `total=... passed=... failed=0`
  - report contains per-scenario verdicts and failure reasons (if any)
  - if `failed > 0`, command exits with code `1` (useful for CI gating)

Run isolated prompt tuning loop (mock mode) and write latest report:

```bash
uv run --project apps/agents python apps/agents/scripts/run_prompt_tuning_loop.py --mode mock --fail-on-unapproved
```

What this does:
- Runs isolated prompt checks per agent (no multi-agent orchestration).
- Scores candidate prompt versions and decides which versions are approved.
- Writes a tuning report JSON to:
  - `apps/agents/eval-artifacts/prompt-tuning-loop-latest.json`
- With `--fail-on-unapproved`, exits non-zero if any targeted agent has no approved prompt version.
- Optional:
  - add `--write-freeze-map` to persist approved versions into freeze-map config for release use.

Example scenario:
- You updated prompt versions for `menu-profit-intelligence` and `what-if-simulation`.
- Run:
  - `uv run --project apps/agents python apps/agents/scripts/run_prompt_tuning_loop.py --mode mock --agent menu-profit-intelligence --agent what-if-simulation --fail-on-unapproved --write-freeze-map`
- Expected result:
  - report lists each targeted agent and approval status
  - `approved_prompt_versions` contains approved versions only
  - if one agent has no approved candidate, command exits with code `1`
  - if both pass, freeze-map is written and can be used as release baseline

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
- `POST /agents/evaluation/harness`
- `POST /agents/evaluation/prompt-tuning`

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
- `apps/agents/eval-fixtures/prompt-tuning-pilot/**`: mocked pilot dataset fixtures.
- `apps/agents/tests/integration_tests/*.py`: integration coverage by story/capability.
- `apps/agents/tests/integration_tests/test_mocked_input_baseline_per_agent.py`: mandatory per-agent mocked baseline gate.

Pilot dataset contract reference:
- `packages/docs/contracts/AGENT_PROMPT_TUNING_PILOT_MARKETER_STRATEGIST_DATASET_V1.md`

## Notes

- Runtime defaults:
  - `AGENTS_LLM_ENABLED=true`
  - `AGENTS_LLM_PROVIDER=mock`
  - `AGENTS_LLM_FAILURE_MODE=fallback` (`fallback|blocked`)
- Set `AGENTS_LLM_PROVIDER=openai` with `OPENAI_API_KEY` to run live provider mode.
- Optional per-agent runtime overrides:
  - `AGENTS_MODEL_ID_<AGENT_ID_NORMALIZED>`
  - `AGENTS_PROMPT_VERSION_<AGENT_ID_NORMALIZED>`
