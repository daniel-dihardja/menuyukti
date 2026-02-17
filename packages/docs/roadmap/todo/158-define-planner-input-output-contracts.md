# Story 158: Define planner input/output contracts

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 156

## Goal
Define strict typed contracts for autonomous planner input and next-action output.

## Why This Matters
- LLM output must be schema-validated before execution for safety and determinism.

## Scope
- Add zod schemas for:
  - planner input (mission objective, context snapshot, action history, guardrails)
  - planner output (next action, reason, confidence, expected outcome)
- Restrict planner action vocabulary to safe allowed actions.

## Acceptance Criteria
- Contracts are shared/reusable in runner and planner modules.
- Invalid planner outputs fail fast with explicit validation errors.

## Deliverables
- Planner contract module + types.
