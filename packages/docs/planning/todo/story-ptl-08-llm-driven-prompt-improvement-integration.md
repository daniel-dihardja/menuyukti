# Story PTL-08: Codex-Driven Prompt Improvement Integration

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `5`

## Goal
Integrate Codex-generated prompt revisions into the pilot loop so below-threshold iterations are improved by Codex orchestration.

## Why This Matters
- Implements the core workflow requirement: Codex analyzes and improves prompt every iteration.
- Replaces heuristic-only behavior with a spec-driven improvement step.

## Scope
- Add Codex-driven improver step between scoring and next iteration run.
- Pass structured iteration diagnostics to Codex through artifact inputs.
- Validate revised prompt contract before using next candidate.
- Keep deterministic scoring gate unchanged as the final pass/fail authority.

## Acceptance Criteria
- For below-threshold iterations, next prompt candidate comes from Codex improver output.
- Iteration artifacts include improver input/output traces (or safe summary).
- Invalid improver output is handled safely and does not corrupt loop state.
- Mocked-fixture-only input policy remains enforced.

## Deliverables
- Updated pilot loop implementation using Codex improver step.
- Updated CLI/report artifacts showing improver metadata per iteration.
- Implementation notes in story closure evidence.
