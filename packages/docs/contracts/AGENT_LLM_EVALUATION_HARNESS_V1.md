# Agent LLM Evaluation Harness v1

## Purpose
Define the Phase 1 evaluation rubric and pass/fail rules for isolated agent LLM runs using mocked required inputs.

## Harness API
- Agents endpoint: `POST /agents/evaluation/harness`
- Web surface: `GET /api/agents/evaluation/harness`
- CLI: `python apps/agents/scripts/run_llm_evaluation_harness.py`

## Request
- `contract_version`: `v1`
- `mode`: `mock | live`
- `agents`: optional list of agent ids
- `fail_fast`: optional boolean

## Response Summary
- `harness_version`
- `thresholds.quality_score_min`
- `summary.total`
- `summary.passed`
- `summary.failed`
- `summary.pass_rate`
- `summary.release_gate_passed`
- `results[]` with per-agent and per-scenario outcome

## Required Contract Checks
Each result must validate:
- structured envelope fields:
  - `contract_version`
  - `agent_id`
  - `status`
  - `reason_code`
  - `run`
  - `llm`
- run metadata fields:
  - `run_id`
  - `model_id`
  - `prompt_version`
  - `llm_provider`
  - `llm_mode`
  - `llm_status`
- llm metadata fields:
  - `status`
  - `provider`
  - `mode`
  - `prompt_version`
  - `model_id`
- typed domain payload checks per agent scenario
- fallback consistency check

## Quality Score
- Dimensions:
  - readability
  - actionability
- Score:
  - `quality_score = passed_dimensions / total_dimensions`
- Threshold:
  - `quality_score_min = 0.70`

## Mode Behavior
- `mock`:
  - uses mocked provider runtime with deterministic upstream input fixtures.
- `live`:
  - requires `OPENAI_API_KEY`
  - still uses mocked required inputs
  - executes real provider calls for Phase 1 release-readiness evaluation.
