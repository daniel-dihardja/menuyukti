# Story 152: Add E2E Env Profile and Shared-DB Safety Guard

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 151

## Goal
Introduce a dedicated `.env.e2e` profile and runtime guardrails that allow E2E to use the current DB safely while blocking obvious production misconfiguration.

## Why This Matters
- Prevents accidental E2E runs against production-like targets.
- Makes service URLs and runtime settings explicit and reproducible.
- Creates a stable base for both local and CI E2E execution.

## Scope
- Add `.env.e2e.example` with required service endpoints and E2E flags.
- Add preflight guard that validates `DATABASE_URL` safety patterns before E2E starts.
- Add hard failure with actionable message when guard fails.

## Acceptance Criteria
- E2E runner reads from `.env.e2e` (or equivalent profile load path).
- Guard fails when DB target matches disallowed production-like patterns.
- Guard passes for approved local/shared dev targets.

## Deliverables
- Environment profile template for E2E.
- Shared-DB safety guard utility used by E2E runner.
- Short readme snippet describing required env setup.
