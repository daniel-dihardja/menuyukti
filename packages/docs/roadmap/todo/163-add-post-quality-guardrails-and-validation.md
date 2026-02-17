# Story 163: Add Post Quality Guardrails and Validation

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Prevent low-quality or invalid post drafts from being saved/approved.

## Why This Matters
- Protects campaign quality and reduces publishing mistakes.

## Scope
- Add server-side validation rules for caption length, CTA presence, hashtag count, and required context.
- Add warning vs blocking classification.
- Surface machine-readable validation codes to UI.

## Acceptance Criteria
- Invalid payloads are rejected with structured error codes.
- Warning-only cases are shown but do not block save.
- Guardrail behavior is deterministic and covered by tests.
- UI displays clear actionable feedback.

## Deliverables
- Guardrail policy module.
- API validation integration.
- Unit/integration tests and UI handling.
