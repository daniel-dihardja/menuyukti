# Story AST-05: Output Trust Panel

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Standardize output trust display across agents: confidence, readiness, evidence, lineage, and guardrail state.

## Why This Matters
- Prevents over-trusting weak outputs.
- Makes outputs auditable and operationally safe.

## Scope
- Build reusable trust panel component for agent outputs.
- Include confidence/readiness/evidence/lineage/guardrail fields.
- Render fallback/blocked reasons explicitly.

## Acceptance Criteria
- All Phase 1 agent pages display trust panel for run outputs.
- Trust panel fields are present and consistently formatted.
- Agents app integration tests validate trust field presence in response contracts.
- Story-specific E2E validates trust panel rendering for ready and degraded states.

## Deliverables
- Reusable trust panel UI.
- Contract adapters for all Phase 1 agent outputs.
- Integration tests for trust metadata contract completeness.
- Story E2E suite and evidence.
