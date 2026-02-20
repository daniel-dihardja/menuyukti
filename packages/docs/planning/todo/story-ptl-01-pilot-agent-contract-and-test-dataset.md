# Story PTL-01: Pilot Agent Contract and Test Dataset

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
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
