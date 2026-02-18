# Story AST-10: Prompt and Model Contract Versioning

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Define and version prompt/model contracts for each Phase 1 agent.

## Why This Matters
- Makes prompt changes auditable and reversible.
- Prevents silent schema drift in outputs.

## Scope
- Create prompt template files/specs per agent.
- Enforce output-schema constraints in prompt contract.
- Add version labels for prompt and model in outputs and logs.

## Acceptance Criteria
- Each Phase 1 agent has `prompt_version` and `model_id` contract fields.
- Prompt templates are versioned and referenced at runtime.
- Agents app integration tests validate schema compliance across prompt versions.
- Story-specific E2E validates prompt/model version visibility in Agent Studio output metadata.

## Deliverables
- Prompt/model contract docs + runtime mapping.
- Version-aware prompt loading.
- Integration tests for contract version behavior.
- Story E2E suite and evidence.
