# Story 124: Update manual and specs for operation runner

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 120

## Goal
Document operation-runner behavior so users understand queue processing and recovery.

## Why This Matters
- Current docs imply operation triggering but do not explain runner execution lifecycle.
- Teams need clear expectations for queued/running/failed transitions.

## Scope
- Update manual operations chapter with:
  - queue lifecycle,
  - runner trigger model,
  - stale queue recovery behavior.
- Update `SPECS.md` implementation status and feature table lines.

## Acceptance Criteria
- Manual clearly explains why jobs can be queued and how they get consumed.
- Specs accurately reflect shipped operation-runner behavior.

## Deliverables
- Manual updates.
- Specs updates.
