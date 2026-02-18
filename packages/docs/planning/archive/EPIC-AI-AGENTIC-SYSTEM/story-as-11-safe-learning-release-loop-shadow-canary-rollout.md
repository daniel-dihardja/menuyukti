# Story AS-11: Safe Learning Release Loop (Shadow -> Canary -> Rollout)

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
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

## Implementation Notes
- Added agents release-loop evaluator endpoint:
  - `POST /agents/learning/release-loop/evaluate`
  - file: `apps/agents/src/agent/release_loop.py`
- Added release-loop API orchestration in web app:
  - `POST /api/agents/learning/release-loop` (stage evaluation + persistence)
  - `GET /api/agents/learning/release-loop` (audit history)
  - file: `apps/web/app/api/agents/learning/release-loop/route.ts`
- Added release-loop audit repository with tenant-scoped records:
  - file: `apps/web/lib/agents/release-loop-repository.ts`
- Added Agent Studio runner UI for shadow/canary/rollout and rollback feedback:
  - file: `apps/web/app/(protected)/agents/[agentId]/release-loop-runner.tsx`
- Added Agent Studio registration for `learning-release-loop`:
  - file: `apps/web/lib/agents.json`
- Integrated release-loop suite in batch/full E2E runners:
  - files: `apps/web/scripts/run-e2e-shared-services.ts`, `apps/web/scripts/run-e2e-full.ts`, `apps/web/package.json`

## Test Evidence
- Agents integration test:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_release_loop_agent.py`
- Type check:
  - `pnpm -C apps/web run typecheck`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:learning-release-loop`
