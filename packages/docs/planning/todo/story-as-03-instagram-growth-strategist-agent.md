# Story AS-03: Instagram Growth Strategist Agent

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Ship the marketer-facing strategist agent that produces weekly Instagram plans with evidence and confidence/readiness.

## Why This Matters
- Delivers direct marketer value: faster, higher-quality campaign planning.
- Converts analytics into executable weekly priorities.

## Scope
- Build strategist response contract: prioritized items, posting windows, rationale, confidence/readiness.
- Integrate with scheduler handoff flow and decision package export.
- Enforce guardrails for stale/low-quality contexts.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Marketer can generate and review a weekly plan from eligible analytics context.
- Output includes contract-compliant evidence and trust metadata.
- End-to-end strategist flow tests pass.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Strategist agent route and service logic.
- Scheduler handoff integration.
- E2E and contract test updates.

