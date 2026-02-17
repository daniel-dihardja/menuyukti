# Story 125: Refactor pipeline into staged orchestration epic

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Refactor the current upload + COGS-triggered recompute flow into a single staged, lineage-aware pipeline.

## Why This Matters
- Current execution paths are split and create operational ambiguity.
- Queue/runner behavior, retries, and read consistency need stronger guarantees.

## Scope
- Introduce stage-based orchestration model.
- Preserve current user-visible behavior while improving reliability.
- Deliver incrementally with backward-compatible rollout.

## Acceptance Criteria
- Foundational stories 126-127 are completed.
- Remaining child stories 128-133 are completed.
- Upload and COGS scenarios are orchestrated via shared stage lifecycle.
- Operations visibility and recovery become deterministic.

## Deliverables
- Parent epic tracking for staged pipeline refactor stories 126-133.
