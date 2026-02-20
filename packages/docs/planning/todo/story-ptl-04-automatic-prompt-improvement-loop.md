# Story PTL-04: Automatic Prompt Improvement Loop

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
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
