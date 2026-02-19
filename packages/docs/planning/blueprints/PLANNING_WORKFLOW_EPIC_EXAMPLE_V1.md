# Epic: Data Import Reliability

## Epic ID
EPIC-DATA-IMPORT-RELIABILITY

## Owner
Data Platform Team

## Status
Draft

## Goal
Reduce failed data imports by introducing deterministic validation and clear recovery flow.

## Why This Epic
- Import failures currently surface too late and require manual triage.
- Reliable input quality directly impacts downstream workflows.

## In Scope
- Input schema validation before ingestion.
- Import error classification and user-facing error messages.
- Retry-safe ingestion workflow for transient failures.
- E2E checks for import happy path and common failure modes.

## Out of Scope
- Full UI redesign of import page.
- Historical data backfill for old failed runs.

## Story List
1. **DIR-01: Import Input Contract v1**
- Define required columns/types and rejection reasons.

2. **DIR-02: Import Validation Pipeline**
- Validate payloads before persistence and classify failures.

3. **DIR-03: Retry and Idempotency Guardrails**
- Ensure retries do not duplicate data.

4. **DIR-04: Import Error UX and Messaging**
- Surface actionable errors and recovery actions.

5. **DIR-05: Import E2E Reliability Suite**
- Add E2E coverage for success/degraded/failure scenarios.

## Acceptance Criteria
- Import contract is documented and enforced.
- Invalid inputs fail fast with explicit reason codes.
- Retry flow is idempotent for repeated attempts.
- E2E suite verifies key reliability scenarios.

## Risks
- Existing clients may rely on permissive upload behavior.
- Stricter validation may increase initial rejection rate.

## Mitigations
- Ship contract compatibility notes and phased rollout toggle.
- Add clear migration guidance and sample valid files.
