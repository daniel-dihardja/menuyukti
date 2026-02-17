# Story 134: Descope operations feature from MVP epic

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Remove the retry/replay/backfill operations feature from the MVP release surface.

## Why This Matters
- Operations actions for ingest replay are low-value in current architecture because source files are not persisted.
- Removing non-MVP capabilities reduces product complexity and user confusion.
- MVP should focus on direct marketer and menu-analyst value paths.

## Scope
- Remove operations route/page/actions from user-visible MVP flows.
- Keep only ETL internals required for core upload and COGS -> matrix workflows.
- Align docs/specs/tests with the reduced scope.

## Acceptance Criteria
- Operations UI is no longer accessible in MVP product navigation/routes.
- Operations API endpoints are removed or disabled behind explicit non-MVP guard.
- MVP docs/specs contain no release-critical dependency on operations feature.

## Deliverables
- Parent epic tracking de-scope stories 135-138.
