# Story PTL-01: Pilot Agent Contract and Test Dataset

## Story Metadata
- Created Date: 2026-02-20
- Status: `complete`
- Completed Date: 2026-02-20
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `3`

## Goal
Define the pilot `marketer-strategist` input/output contract and a fixed high-quality test dataset used by all subsequent tuning steps.

## Why This Matters
- Creates a stable foundation so prompt iterations are measurable.
- Prevents invalid comparisons caused by changing inputs during tuning.

## Scope
- Define pilot input schema: `restaurant_name`, `menu_item`, `target_audience`, `tone`.
- Define output schema: `caption`, `cta`, `hashtags`.
- Create curated pilot dataset with version id and case coverage notes.
- Lock dataset file/version for PTL pilot runs.

## Acceptance Criteria
- Contract fields and required/optional rules are documented and versioned.
- Pilot dataset exists with deterministic test cases and expected context.
- Dataset version is referenced by downstream runner/scoring stories.
- Dataset includes at least one normal case and one edge case.
- Dataset is fully mocked and contains no live production data dependencies.

## Deliverables
- Pilot contract spec doc/file.
- Versioned pilot dataset artifact.
- Dataset coverage notes.

## Implementation Notes
- Added pilot mocked dataset fixture:
  - `apps/agents/eval-fixtures/prompt-tuning-pilot/marketer-strategist-caption-dataset-v1.json`
- Added dataset contract reference:
  - `packages/docs/contracts/AGENT_PROMPT_TUNING_PILOT_MARKETER_STRATEGIST_DATASET_V1.md`
- Added unit coverage for dataset integrity and mocked-data policy:
  - `apps/agents/tests/unit_tests/test_prompt_tuning_pilot_dataset.py`
- Updated agents service README source layout reference:
  - `apps/agents/README.md`

## Test Evidence
- `uv run --project apps/agents pytest apps/agents/tests/unit_tests/test_prompt_tuning_pilot_dataset.py`
  - Result: 2 passed
