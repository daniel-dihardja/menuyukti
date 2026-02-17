# Story 153: Build E2E Service Orchestrator for Cold Start

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 151

## Goal
Create a single orchestrator that starts analytics, agents, and web services from a fully down state, waits for readiness, and tears down reliably.

## Why This Matters
- Eliminates manual service boot sequencing.
- Ensures E2E starts from a known operational baseline.
- Reduces false negatives caused by race conditions and missing services.

## Scope
- Start all required services in background process management.
- Add health-check polling and timeout behavior per service.
- Add guaranteed teardown (`finally`/trap) for pass/fail/interrupted test runs.

## Acceptance Criteria
- One command can bring all three services up from down state.
- Readiness checks gate test execution until services are healthy.
- All spawned processes are cleaned up on completion or failure.

## Deliverables
- E2E orchestrator script/runner.
- Service logs persisted to deterministic artifact paths.
- `package.json` script entry for orchestrated execution.
