# Agent Workflow Blueprint V1 (AS-01)

## Purpose
Define the end-to-end workflow model for the new AI agentic system, with explicit marketer and analyst journeys, guardrail states, and downstream handoffs.

Related:
- `packages/docs/planning/todo/epic-ai-agentic-system.md`
- `packages/docs/planning/todo/story-as-01-agent-workflow-blueprint-and-persona-journeys.md`
- `packages/docs/planning/SPECS.md`

## Persona Journeys

### 1) Marketer Journey (Instagram Planning)
1. Open `matrix` and review promotion candidates.
2. Validate trust/readiness signals.
3. Convert selected candidates into `scheduler` entries.
4. Generate post draft package from scheduler context.
5. Review confidence/evidence for final publish preparation.

Required handoffs:
- `matrix` -> `scheduler` recommendation handoff
- `scheduler` -> post draft package handoff
- `scheduler` -> attribution feedback context (next cycle)

### 2) Analyst Journey (Menu Decisioning)
1. Open decision surfaces (`matrix`, `pairs`, `attribution`) for weekly review.
2. Validate evidence/trust fields on recommendations.
3. Build analyst decision board (`promote/improve/bundle/deprioritize`).
4. Export decision package for stakeholder review.

Required handoffs:
- `matrix/pairs/attribution` -> analyst action board
- analyst board -> export contract payload

## UX State Model (Required)

All agentic surfaces must support:
- `blocked`
- `degraded`
- `ready`
- `post_execution_feedback_available`

Policy meaning:
- `blocked`: no recommendation execution allowed
- `degraded`: recommendation visible with explicit risk warning
- `ready`: recommendation flow allowed
- `post_execution_feedback_available`: prior execution outcomes are visible for learning loop

## Output Contract Requirements

Every agent/decision output shown to users must include:
- recommendation payload
- rationale
- confidence
- readiness
- evidence refs
- lineage/freshness metadata

## Story Dependency Map

- `AS-00` (complete): legacy audience/tone retirement
- `AS-01` (this story): blueprint + journey map + test matrix
- `AS-02`: tool contracts/runtime policy
- `AS-03`: marketer strategist agent
- `AS-04`: analyst profit intelligence agent
- `AS-08`: guardrail + release gate hardening

Learning flow dependencies:
- `AS-09` data model -> `AS-10` reranking -> `AS-11` safe rollout

## Agents App Integration Test Matrix (Pre-Integration Gate)

The following integration suites are required in `apps/agents` before web-app integration is enabled:

| Story | Required Agents-App Integration Coverage |
|---|---|
| AS-02 | tool contract validation, policy gating, tenant scope checks |
| AS-03 | strategist invoke contract, output schema, guardrail-block behavior |
| AS-04 | analyst invoke contract, action-board schema, evidence completeness |
| AS-05 | strategy/risk consensus merge behavior and disagreement serialization |
| AS-06 | simulation input/output schema and scenario ranking determinism |
| AS-07 | memory read/write, versioning, bounded-context retrieval |
| AS-08 | guardrail policy compliance and release eval harness integration |
| AS-09 | learning event capture and linkage integrity |
| AS-10 | reranking determinism, fallback behavior, explainability fields |
| AS-11 | shadow/canary gate behavior and rollback trigger correctness |

Gate rule:
- For each story above, agents-app integration tests must pass before enabling corresponding web-app entry points.

