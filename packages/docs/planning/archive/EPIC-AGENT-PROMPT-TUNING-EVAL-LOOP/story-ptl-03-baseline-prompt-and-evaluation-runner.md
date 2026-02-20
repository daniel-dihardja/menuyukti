# Story PTL-03: Baseline Prompt and Evaluation Runner

## Story Metadata
- Created Date: 2026-02-20
- Status: `complete`
- Completed Date: 2026-02-20
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `5`

## Goal
Create prompt v1 and a baseline evaluation runner that scores the pilot dataset using the locked scoring spec.

## Why This Matters
- Establishes the reference point for all improvements.
- Ensures prompt-loop progress is measured against a consistent baseline.

## Scope
- Define initial pilot prompt (`v1`) for `marketer-strategist`.
- Implement baseline run command/path using fixed model/provider settings.
- Evaluate all pilot cases and produce baseline artifact.
- Include per-case scores and total score summary.

## Acceptance Criteria
- Baseline run executes end-to-end from dataset + prompt + scorer.
- Baseline artifact includes required schema fields from epic artifact contract.
- Baseline score is reproducible with fixed determinism settings.
- Failure states are reported when output schema is invalid.
- Runner reads evaluation inputs only from mocked fixture dataset.

## Deliverables
- Prompt v1 artifact.
- Baseline evaluation runner implementation.
- Baseline result artifact/report.

## Implementation Notes
- Added pilot baseline prompt artifact:
  - `apps/agents/prompts/marketer-strategist/pilot-v1.txt`
- Added pilot baseline evaluation engine:
  - `apps/agents/src/agent/prompt_tuning_pilot.py`
  - `run_pilot_baseline()`
  - `evaluate_prompt_against_pilot()`
- Added CLI command for baseline execution:
  - `apps/agents/scripts/run_prompt_tuning_pilot.py`
  - `--mode baseline`
- Added unit coverage for baseline output shape:
  - `apps/agents/tests/unit_tests/test_prompt_tuning_pilot_loop.py`

## Test Evidence
- `uv run --project apps/agents pytest apps/agents/tests/unit_tests/test_prompt_tuning_pilot_dataset.py apps/agents/tests/unit_tests/test_prompt_tuning_pilot_scoring_spec.py apps/agents/tests/unit_tests/test_prompt_tuning_pilot_loop.py`
  - Result: 7 passed
- `uv run --project apps/agents python apps/agents/scripts/run_prompt_tuning_pilot.py --mode baseline`
  - Result: report written to `apps/agents/eval-artifacts/pilot/prompt-tuning-pilot-latest.json`
