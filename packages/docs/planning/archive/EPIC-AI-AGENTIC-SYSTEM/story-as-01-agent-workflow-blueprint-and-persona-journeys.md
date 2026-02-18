# Story AS-01: Agent Workflow Blueprint and Persona Journey Maps

## Story Metadata

- Created Date: 2026-02-18
- Status: `complete`
- Completed Date: 2026-02-18
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal

Define the end-to-end workflows for marketer and analyst agents, including required decisions, user touchpoints, and outputs.

## Why This Matters

- Aligns product, engineering, and data teams on one implementation path.
- Prevents ambiguous agent behavior and UX fragmentation.

## Scope

- Map marketer and analyst journey flows from data-ready state to action.
- Define required inputs, outputs, and handoffs for each workflow stage.
- Define UX states: blocked, degraded, ready, and post-execution feedback.

## Acceptance Criteria

- Journey maps exist for both personas with decision gates and guardrail points.
- Workflow definitions include concrete handoff points to scheduler and exports.
- Product and engineering sign-off recorded.
- Agents app integration test matrix is defined for AS-02 through AS-11 before implementation starts.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables

- Agents app integration test strategy and matrix (pre-integration gate design).
- Story-specific E2E test case(s) and execution evidence.
- Agent workflow blueprint document.
- Persona journey maps with state transitions.
- Story dependency map for AS-02 onward.

## Notes
- Implemented artifact:
  - `packages/docs/planning/blueprints/AGENT_WORKFLOW_BLUEPRINT_V1.md`
- Story-specific E2E scenario:
  - `apps/web/e2e/agent-workflow-blueprint.e2e.ts`
  - script: `pnpm -C apps/web run test:e2e:agents:workflow-blueprint`
- Verification:
  - `pnpm -C apps/web run typecheck` (passed)
  - `pnpm -C apps/web run test:e2e:agents:workflow-blueprint` (passed)
