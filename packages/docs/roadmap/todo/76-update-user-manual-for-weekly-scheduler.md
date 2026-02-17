# Story 76: Update User Manual for Weekly Scheduler

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 73

## Goal
Update the user manual so marketers and analysts can correctly use the weekly scheduler workflow and related trust signals.

## Why This Matters
- New capabilities are only valuable if users can execute them consistently.
- Documentation must stay aligned with shipped behavior and release-gate expectations.

## Scope
- Add/extend manual content for weekly scheduler setup and daily usage flow.
- Document trust/guardrail behavior (confidence, blocked states, and readiness impacts).
- Document expected input/output flow across recommendations, schedules, and campaign/post mapping.
- Update manual index/navigation so scheduler docs are discoverable.

## Acceptance Criteria
- Manual includes step-by-step weekly scheduler workflow with realistic examples.
- Manual includes guidance for low-readiness/blocked scenarios and recovery actions.
- Manual references are consistent with current route/API behavior and terminology.
- Manual index links are valid and render in docs route.

## Deliverables
- Updated markdown file(s) in `packages/docs/manual/`.
- Updated `packages/docs/manual/README.md` index entries.
