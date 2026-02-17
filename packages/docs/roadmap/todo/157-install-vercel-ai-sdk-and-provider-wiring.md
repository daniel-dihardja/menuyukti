# Story 157: Install Vercel AI SDK and provider wiring

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 156

## Goal
Add Vercel AI SDK dependencies and initial model/provider environment wiring for planner use.

## Why This Matters
- Planner layer needs a production-ready LLM SDK with structured-output support.

## Scope
- Add dependencies in `apps/web`:
  - `ai`
  - provider package (`@ai-sdk/openai`)
- Add required environment variable documentation.
- Add lightweight runtime helper for model initialization.

## Acceptance Criteria
- Project builds/typechecks with new SDK dependencies.
- Planner foundation can import SDK/model without runtime wiring errors.

## Deliverables
- Dependency updates + provider setup helper.
