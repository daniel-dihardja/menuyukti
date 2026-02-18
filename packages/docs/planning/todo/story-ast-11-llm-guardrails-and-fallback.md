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

## Acceptance Criteria
- Provider failure triggers explicit fallback or blocked response.
- Low-readiness contexts return degraded/blocked state with reason code.
- Agents app integration tests cover failure modes with mocked inputs/provider errors.
- Story-specific E2E validates blocked/degraded/fallback rendering in Agent Studio.

## Deliverables
- Guardrail and fallback implementation.
- Reason-code catalog for LLM failure states.
- Failure-mode integration tests.
- Story E2E suite and evidence.
