# Story 149: Implement AI explorer runner and mission orchestrator

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 146

## Goal
Build the orchestration loop that runs AI missions against the Playwright adapter and emits structured findings.

## Why This Matters
- Connects reasoning (AI) with execution (browser automation).
- Enables repeatable autonomous exploratory sessions.

## Scope
- Build mission runner CLI (load mission, run steps, persist artifacts).
- Integrate AI decision loop with bounded turns and step budget.
- Persist mission transcript, action log, screenshot index, and findings JSON.
- Add deterministic run IDs and output folder conventions.

## Acceptance Criteria
- A mission can run end-to-end and generate a valid findings report.
- Runner enforces guardrails and exits with explicit status codes.
- Re-running the same mission generates comparable artifact sets.

## Deliverables
- Runner CLI + orchestration service + artifact writer.

## Dependencies
- Stories 147-148.
