# Agent LLM Evaluation Harness

This guide explains how to run the Agent LLM Evaluation Harness and interpret results.

## Purpose

The evaluation harness is a quality gate for Agent Studio Phase 1 agents.

It verifies that each agent response:

- keeps the structured contract envelope
- includes run/LLM metadata
- returns typed domain payloads (not free-form-only text)
- passes minimum quality scoring (readability + actionability)

## When To Use It

Use this before:

- merging prompt/model changes
- validating release readiness
- comparing mock-mode and live-provider behavior

## Evaluation Modes

- `mock`:
  - default mode
  - mocked provider runtime + mocked required inputs
  - stable and repeatable for CI
- `live`:
  - real LLM provider calls with mocked required inputs
  - requires `OPENAI_API_KEY`
  - use for release-readiness checks

## Run In Agents App (CLI)

From repo root:

```bash
uv run --project apps/agents python apps/agents/scripts/run_llm_evaluation_harness.py --mode mock --fail-on-fail
```

Run only selected agents:

```bash
uv run --project apps/agents python apps/agents/scripts/run_llm_evaluation_harness.py --mode mock --agent marketer-strategist --agent what-if-simulation --fail-on-fail
```

Run live mode:

```bash
OPENAI_API_KEY=... uv run --project apps/agents python apps/agents/scripts/run_llm_evaluation_harness.py --mode live --fail-on-fail
```

Default artifact path:

- `apps/agents/eval-artifacts/llm-evaluation-latest.json`

## Run Through Web Surface

The web app exposes the harness via:

- `GET /api/agents/evaluation/harness?mode=mock`
- `GET /api/agents/evaluation/harness?mode=live`
- `GET /api/agents/evaluation/harness?mode=mock&agents=marketer-strategist,what-if-simulation`

## E2E Validation

Story E2E command:

```bash
pnpm -C apps/web run test:e2e:agents:llm-evaluation-harness
```

This validates that surfaced harness state is reachable and returns expected summary/result fields.

## How To Read Results

Important fields in each run:

- `summary.total`
- `summary.passed`
- `summary.failed`
- `summary.pass_rate`
- `summary.release_gate_passed`

Per-scenario result fields:

- `agent_id`
- `scenario_id`
- `prompt_version`
- `model_id`
- `status`
- `reason_code`
- `llm_status`
- `checks`
- `quality_score`
- `passed`

## Thresholds And Rules

- Quality threshold:
  - `quality_score_min = 0.70`
- Critical checks must pass:
  - required envelope fields
  - run metadata present
  - llm metadata present
  - typed domain payload valid
  - fallback consistency valid

Any failure in critical checks or quality threshold marks that scenario as failed.

## Troubleshooting

- `OPENAI_API_KEY_MISSING_FOR_LIVE_EVALUATION`:
  - set `OPENAI_API_KEY` before `--mode live`.
- `release_gate_passed=false`:
  - inspect `results[].errors` and `results[].checks`.
- unexpected fallback/blocked statuses:
  - verify:
    - `AGENTS_LLM_ENABLED`
    - `AGENTS_LLM_PROVIDER`
    - `AGENTS_LLM_FAILURE_MODE`
