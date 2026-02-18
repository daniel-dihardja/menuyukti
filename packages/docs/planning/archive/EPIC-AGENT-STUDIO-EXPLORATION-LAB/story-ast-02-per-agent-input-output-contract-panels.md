# Story AST-02: Per-Agent Input/Output Contract Panels

## Story Metadata
- Created Date: 2026-02-18
- Status: `done`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Provide contract panels on each agent page showing required inputs and expected outputs with schema-focused clarity.

## Why This Matters
- Builds trust by making contracts explicit.
- Speeds debugging and testing for both product and engineering.

## Scope
- Add input contract panel with required fields and value constraints.
- Add output contract panel with required trust metadata fields.
- Include prompt/model contract version reference on the page.

## Acceptance Criteria
- Each Phase 1 agent detail page shows input and output contract sections.
- Contract sections include required fields and version labels.
- Agents app integration tests validate output schema compatibility with shown contract.
- Story-specific E2E validates panel visibility and contract labels on agent pages.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Contract panel UI components.
- Contract metadata binding from agent definitions/contracts.
- Integration tests for schema compatibility.
- Story E2E suite and evidence.

## Implementation Notes
- Added contract metadata model to agent definitions:
  - input/output contract versions
  - prompt/model contract versions
  - required trust fields
  - input value constraints
  - files: `apps/web/lib/agent-definitions.ts`, `apps/web/lib/agents.json`
- Added contract compatibility validation helper:
  - file: `apps/web/lib/agents/contract-schema.ts`
- Updated agent detail pages with explicit contract panels:
  - Input Contract panel with version badges and value constraints
  - Output Contract panel with version badges and required trust metadata fields
  - file: `apps/web/app/(protected)/agents/[agentId]/page.tsx`
- Added unit test for contract-schema compatibility:
  - file: `apps/web/tests/lib/agents/contract-schema.test.ts`
- Added story-specific E2E for contract panel visibility/version labels:
  - file: `apps/web/e2e/agent-contract-panels.e2e.ts`
- Added E2E script and runner wiring:
  - `apps/web/package.json`
  - `apps/web/scripts/run-e2e-shared-services.ts`
  - `apps/web/scripts/run-e2e-full.ts`
  - `apps/web/e2e/README.md`

## Test Evidence
- Agents integration tests:
  - `uv run --project apps/agents pytest apps/agents/tests/integration_tests`
- Web type check:
  - `pnpm -C apps/web run typecheck`
- Unit test:
  - `pnpm -C apps/web exec vitest run tests/lib/agents/contract-schema.test.ts`
- Story E2E:
  - `pnpm -C apps/web run test:e2e:agents:contract-panels`
