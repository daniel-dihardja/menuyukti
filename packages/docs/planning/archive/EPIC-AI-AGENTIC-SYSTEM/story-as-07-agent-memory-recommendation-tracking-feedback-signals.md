# Story AS-07: Agent Memory, Recommendation Tracking, and Feedback Signals

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Add bounded, versioned memory to track recommendations and user responses across planning cycles.

## Why This Matters
- Enables continuity between weekly decision cycles.
- Creates learning signals without uncontrolled memory drift.

## Scope
- Persist recommendation records and accepted/rejected states.
- Persist minimal rationale memory and execution linkage.
- Add query layer for latest relevant memory in context assembly.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Memory records are versioned and tenant-scoped.
- Agent context assembly can use recent recommendation history.
- Memory retrieval and persistence tests pass.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Memory data model and repository layer.
- Recommendation tracking service.
- Integration tests for memory continuity.

## Implementation Notes
- Added agents app endpoint: `POST /agents/memory/context` for bounded memory context summarization.
- Added web memory repository layer: `apps/web/lib/agents/memory-repository.ts`.
- Added web API endpoints:
  - `GET /api/agents/memory` for tenant-scoped retrieval.
  - `POST /api/agents/memory` for versioned accepted/rejected tracking.
- Memory records are persisted as versioned events in `agent_outputs` (`agent_id=agent-memory-store`).
- Integrated recent memory retrieval into consensus context assembly and evidence.
- Added `agent-memory-tracker` to Agent Studio with a dedicated runner UI for recording and reviewing feedback signals.

## Test Evidence
- Agents integration tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_memory_context_agent.py apps/agents/tests/integration_tests/test_simulation_agent.py apps/agents/tests/integration_tests/test_consensus_agent.py apps/agents/tests/integration_tests/test_profit_intelligence_agent.py apps/agents/tests/integration_tests/test_strategist_agent.py apps/agents/tests/integration_tests/test_api.py`
- Type check:
  - `pnpm -C apps/web run typecheck`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:memory`
