# Story AS-02: Agent Tool Contract v1 and Runtime Policy

## Story Metadata
- Created Date: 2026-02-18
- Status: `complete`
- Completed Date: 2026-02-18
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Establish versioned tool contracts and runtime policy rules for all agent data access and execution.

## Why This Matters
- Guarantees deterministic grounding and traceability for recommendations.
- Enables safe, tenant-scoped, policy-controlled agent behavior.

## Scope
- Define tool I/O contracts for core decision data and scheduler handoffs.
- Define runtime policy for allowed tools per persona and workflow stage.
- Add contract validation and policy checks in invocation path.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- All critical tools are versioned and schema-validated.
- Policy blocks disallowed tools/scopes and logs reason codes.
- Contract and policy tests pass.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Tool contract specification v1.
- Runtime policy matrix and enforcement logic.
- Test coverage for contract and policy enforcement.

## Notes
- Implemented tool contract + runtime policy in agents app:
  - `apps/agents/src/agent/tool_contract.py`
  - `apps/agents/src/agent/api.py` (`POST /tools/invoke`)
- Added contract spec:
  - `packages/docs/contracts/AGENT_TOOL_CONTRACT_V1.md`
- Added agents-app integration tests:
  - `apps/agents/tests/integration_tests/test_tool_contract_policy.py`
- Added story-specific E2E:
  - `apps/web/e2e/agent-tool-contract-policy.e2e.ts`
  - script: `pnpm -C apps/web run test:e2e:agents:tool-contract-policy`
- Verification:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_tool_contract_policy.py apps/agents/tests/integration_tests/test_api.py` (passed)
  - `pnpm -C apps/web run typecheck` (passed)
  - `pnpm -C apps/web run test:e2e:agents:tool-contract-policy` (passed)
