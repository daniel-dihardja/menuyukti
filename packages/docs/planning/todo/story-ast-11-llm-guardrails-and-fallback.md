# Story AST-11: LLM Guardrails and Fallback

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Add robust guardrail and fallback behavior for LLM execution failures or low-trust states.

## Why This Matters
- Keeps agent outputs safe under provider outages and weak context.
- Protects users from untrusted recommendations.

## Scope
- Add fallback path when provider or schema validation fails.
- Add blocked/degraded response states with reason codes.
- Include deterministic fallback payload where applicable.
- Keep fallback/blocked responses in the same structured contract shape as normal responses.

## Acceptance Criteria
- Provider failure triggers explicit fallback or blocked response.
- Low-readiness contexts return degraded/blocked state with reason code.
- Agents app integration tests cover failure modes with mocked inputs/provider errors.
- Guardrail/fallback paths never degrade to free-form-only responses.
- Story-specific E2E validates blocked/degraded/fallback rendering in Agent Studio.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Guardrail and fallback implementation.
- Reason-code catalog for LLM failure states.
- Failure-mode integration tests.
- Story E2E suite and evidence.
