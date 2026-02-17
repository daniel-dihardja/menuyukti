# Story 154: Wire DB Lifecycle for E2E Seed and Reset

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 151

## Goal
Automate DB lifecycle steps for E2E runs on the current DB: reset, generate/init, deterministic seed, full test run, and final reset.

## Why This Matters
- Removes state leakage between runs.
- Keeps test data deterministic and reproducible.
- Aligns with intended command workflow (`db:reset`, `db:gen`, `db:init`, `db:seed`).

## Scope
- Execute DB lifecycle steps before starting services.
- Seed deterministic E2E data from current approved seed source.
- Execute post-run DB reset regardless of E2E result.

## Acceptance Criteria
- Runner performs pre-run DB setup automatically.
- Runner performs post-run DB reset automatically on success/failure.
- E2E suites run against deterministic seeded state.

## Deliverables
- DB lifecycle step integration in orchestrator.
- Run log output showing each DB phase and status.
- Guardrails for reset failures with explicit exit messaging.
