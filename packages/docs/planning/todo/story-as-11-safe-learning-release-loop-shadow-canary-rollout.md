# Story AS-11: Safe Learning Release Loop (Shadow -> Canary -> Rollout)

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Deliver a governed release loop for learning policy changes with evaluation, staged rollout, and rollback controls.

## Why This Matters
- Prevents uncontrolled self-learning regressions in production.
- Ensures learning improvements are measurable before broad rollout.

## Scope
- Implement shadow evaluation on historical/recent windows.
- Implement canary rollout controls for selected scopes.
- Implement rollback triggers and policy version rollback path.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Learning policy changes cannot reach broad rollout without threshold pass.
- Canary failures trigger rollback automatically with audit logs.
- Release-loop checks are integrated into CI/release playbook.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Learning rollout controller and policy gates.
- Shadow/canary evaluation reports and thresholds.
- Rollback automation and audit logging updates.
