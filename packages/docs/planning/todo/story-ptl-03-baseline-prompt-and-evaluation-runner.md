# Story PTL-03: Baseline Prompt and Evaluation Runner

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
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
