# Story AST-02: Per-Agent Input/Output Contract Panels

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Provide contract panels on each agent page showing required inputs and expected outputs with schema-focused clarity.

## Why This Matters
- Builds trust by making contracts explicit.
- Speeds debugging and testing for both product and engineering.

## Scope
- Add input contract panel with required fields and value constraints.
- Add output contract panel with required trust metadata fields.
- Include prompt/model contract version reference on the page.

## Acceptance Criteria
- Each Phase 1 agent detail page shows input and output contract sections.
- Contract sections include required fields and version labels.
- Agents app integration tests validate output schema compatibility with shown contract.
- Story-specific E2E validates panel visibility and contract labels on agent pages.

## Deliverables
- Contract panel UI components.
- Contract metadata binding from agent definitions/contracts.
- Integration tests for schema compatibility.
- Story E2E suite and evidence.
