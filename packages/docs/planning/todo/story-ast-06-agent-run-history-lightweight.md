# Story AST-06: Agent Run History (Lightweight)

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Add lightweight run history per agent page for recent executions and outcomes.

## Why This Matters
- Supports debugging and comparison workflows.
- Gives users a timeline of runs and confidence changes.

## Scope
- Persist recent run records with timestamps and status.
- Show latest run list on each agent detail page.
- Include prompt version, model id, and fallback usage indicator.

## Acceptance Criteria
- Recent run list is visible and scoped by agent + context.
- Run records include minimum metadata (status, timestamp, prompt/model versions).
- Agents app integration tests validate run-history persistence contract.
- Story-specific E2E validates run history list updates after execution.

## Deliverables
- Run history storage/read APIs.
- Agent detail run-history panel.
- Integration tests for history write/read behavior.
- Story E2E suite and evidence.
