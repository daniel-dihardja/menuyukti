# Story AS-02: Agent Tool Contract v1 and Runtime Policy

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
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

