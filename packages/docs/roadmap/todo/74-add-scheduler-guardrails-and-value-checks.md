# Story 74: Add Scheduler Guardrails and Value Checks

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`

## Goal
Enforce deterministic guardrails in scheduling so low-trust data cannot be presented as high-confidence marketer guidance.

## Why This Matters
- Menuyukti is a data-engineering application; trust policy must remain intact in every decision UI.
- Scheduler outputs must preserve marketer value quality and avoid false confidence.

## Scope
- Apply existing freshness/quality readiness checks to schedule generation and edits.
- Introduce confidence states on schedule entries (`high`, `medium`, `low`, `blocked`) derived from deterministic policy.
- Require rationale snapshots on generated entries (why this item/time was suggested).
- Add validation rules for minimum signal quality before auto-generating schedule drafts.

## Acceptance Criteria
- Low-readiness datasets prevent or downgrade schedule generation per policy.
- Every generated schedule entry includes deterministic rationale and confidence status.
- Guardrail outcomes are machine-readable in API response and visible in UI.
- No schedule entry appears as high confidence when readiness criteria fail.

## Deliverables
- Guardrail utility integration in scheduling APIs.
- Confidence/rationale fields in schedule contracts.
- UI trust badges and blocked-state messaging for scheduling actions.
