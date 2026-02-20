# Story PTL-04: Automatic Prompt Improvement Loop

## Story Metadata
- Created Date: 2026-02-20
- Status: `complete`
- Completed Date: 2026-02-20
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `5`

## Goal
Implement the automatic loop that improves prompt candidates and re-evaluates until pass criteria or max iterations are reached.

## Why This Matters
- Delivers the core automation objective of the pilot.
- Produces structured evidence for prompt quality progression.

## Scope
- Implement iterative flow: generate/improve prompt -> invoke -> score -> decide next step.
- Enforce fixed model/provider and deterministic settings from scoring spec.
- Apply stop condition, fail condition, and regression guard checks.
- Capture iteration-by-iteration artifacts and decision reasons.

## Acceptance Criteria
- Loop retries automatically when score is below threshold.
- Loop stops only when threshold, baseline improvement, and regression guard are all satisfied.
- Loop exits with explicit fail state when max iterations are reached.
- Iteration artifacts include score delta and stop reason.
- Loop executes against mocked fixture inputs only; no live data calls are used.

## Deliverables
- Prompt improvement loop implementation.
- Iteration decision log/artifact outputs.
- Automated pass/fail decision logic.

## Implementation Notes
- Implemented automatic improvement loop logic:
  - `apps/agents/src/agent/prompt_tuning_pilot.py`
  - `run_pilot_improvement_loop()`
  - `_improve_prompt_text()`
- Enforced mocked fixture input usage via pilot fixture paths and data policy.
- Enforced threshold + baseline-delta + regression-guard stop condition.
- Added loop execution CLI path:
  - `apps/agents/scripts/run_prompt_tuning_pilot.py`
  - `--mode loop`
- Added unit tests for iterative loop stop behavior:
  - `apps/agents/tests/unit_tests/test_prompt_tuning_pilot_loop.py`

## Test Evidence
- `uv run --project apps/agents pytest apps/agents/tests/unit_tests/test_prompt_tuning_pilot_loop.py`
  - Result: 3 passed
- `uv run --project apps/agents python apps/agents/scripts/run_prompt_tuning_pilot.py --mode loop --fail-on-unapproved`
  - Result: loop run completed with selected candidate and pass status
