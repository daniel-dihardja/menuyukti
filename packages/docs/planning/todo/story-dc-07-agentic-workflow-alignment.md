# STORY-DC-07: Agentic Workflow Alignment

## Goal
Ensure agent inputs and outputs use canonical contracts with deterministic evidence.

## Scope
- Align agent input contract to canonical entities
- Enforce output schema with confidence/readiness/evidence refs
- Apply data-quality/freshness guardrails in agent responses

## Deliverables
- Agent contract mapping and schema updates
- Guardrail policy implementation for degraded/blocked states
- Agent output persistence with evidence linkage

## Acceptance Criteria (DoD)
- Agent routes pass traceability and guardrail tests
- No agent output is emitted without contract-compliant evidence fields
- Confidence/readiness behavior matches decision-surface policy
