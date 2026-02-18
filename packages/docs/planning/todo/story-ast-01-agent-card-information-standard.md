# Story AST-01: Agent Card Information Standard

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Standardize Agent Studio overview cards so users can immediately understand each agent's purpose, persona, trust scope, and readiness.

## Why This Matters
- Improves discoverability and onboarding speed.
- Reduces misuse by clarifying what each agent is intended to do.

## Scope
- Define required card fields: agent name, persona, purpose, status, trust scope.
- Add consistent visual treatment for `ready` vs `coming_soon`.
- Ensure card metadata derives from versioned agent definitions.

## Acceptance Criteria
- All in-scope Phase 1 agents render the same required card fields.
- Card status semantics are consistent across grid and detail page entry.
- Agents app integration tests pass before web integration changes are enabled.
- Story-specific E2E validates card discoverability and status labeling.

## Deliverables
- Agent card schema/documentation update.
- Web UI implementation for standardized cards.
- Agents app integration tests (mocked input baseline unaffected).
- Story E2E suite and execution evidence.
