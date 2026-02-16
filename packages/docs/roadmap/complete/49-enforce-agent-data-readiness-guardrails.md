# Story 49: Enforce Agent Data Readiness Guardrails

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Block or downgrade agent recommendations when data freshness/quality is below policy.

## Why This Matters
- Prevents low-trust outputs from reaching marketers and analysts.

## Scope
- Add readiness check helper using pipeline quality/freshness metadata.
- Enforce check in agent invocation routes.
- Return structured guardrail status and message.

## Acceptance Criteria
- Agent routes consistently apply readiness policy.
- Guardrail response is explicit and machine-readable.
- Normal behavior remains unchanged when data is healthy.

## Deliverables
- Guardrail utility + route integration.
