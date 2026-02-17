# Story 88: Add attribution confidence policy and tuning

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 86

## Goal
Implement deterministic confidence scoring/downgrade behavior for attribution outputs and expose the rationale in UI/API.

## Why This Matters
- Prevents over-trusting noisy attribution signals.
- Aligns attribution behavior with existing trust/readiness philosophy.
- Helps analysts tune thresholds for practical decision reliability.

## Scope
- Define confidence inputs (sample size, coverage, freshness/quality compatibility).
- Implement confidence tiering (`high`, `medium`, `low`, `blocked` or equivalent).
- Add explanation fields describing why confidence was assigned/downgraded.
- Add optional threshold controls for tuning in analyst-facing workflow.

## Acceptance Criteria
- Attribution records include deterministic confidence status and reason metadata.
- Confidence downgrade occurs when minimum sample/coverage criteria are not met.
- UI displays confidence and rationale without ambiguity.
- Tests validate core scoring and downgrade edge cases.

## Deliverables
- Confidence policy implementation in backend/domain layer.
- API contract update for confidence fields.
- UI rendering of confidence badge + explanation.
- Unit tests for confidence logic.

## Dependencies
- Story 86
- Story 87

