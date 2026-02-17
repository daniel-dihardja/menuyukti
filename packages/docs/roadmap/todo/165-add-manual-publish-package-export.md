# Story 165: Add Manual Publish Package Export

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Allow marketers to export a publish-ready package for manual Instagram posting.

## Why This Matters
- Delivers immediate MVP value without hard dependency on direct Instagram API publishing.

## Scope
- Add export action for approved drafts.
- Include caption, CTA, hashtags, suggested time, menu focus, and checklist metadata.
- Support JSON and/or markdown export format for operations handoff.

## Acceptance Criteria
- Approved draft can be exported from scheduler/composer.
- Export content matches current approved draft state.
- Export response includes deterministic filename and metadata.
- Export flow is covered by integration/E2E tests.

## Deliverables
- Export API route and formatter.
- UI export trigger and download handling.
- Tests for export fidelity.
