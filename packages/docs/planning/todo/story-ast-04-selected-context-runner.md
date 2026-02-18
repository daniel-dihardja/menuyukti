# Story AST-04: Selected Context Runner

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Allow running each agent with user-selected location and analytics context.

## Why This Matters
- Connects exploration to real decision context.
- Enables side-by-side comparison of sample vs real-context outputs.

## Scope
- Support location/analytics selector-driven runs.
- Validate context prerequisites before execution.
- Surface blocked/degraded states when context is insufficient.

## Acceptance Criteria
- Users can run Phase 1 agents with selected location + analytics context.
- Invalid or missing context produces explicit blocked/degraded state.
- Agents app integration tests mock selected-context payload variants.
- Story-specific E2E validates selected-context run flow and state transitions.

## Deliverables
- Selected context run orchestration.
- Guardrail checks for context availability.
- Mocked-input integration tests for selected-context variants.
- Story E2E suite and evidence.
