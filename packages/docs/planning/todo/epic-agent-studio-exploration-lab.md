# Epic: Agent Studio Exploration Lab

## Epic ID
EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Owner
TBD

## Status
Draft

## Why This Epic

Menuyukti already has agent endpoints and per-agent pages. The next step is to make Agent Studio a first-class exploration and evaluation workspace where users can:

- understand what each agent does
- inspect required inputs and expected outputs
- run agents safely with controlled test contexts
- compare agent outputs for the same analytics scope

This turns Agent Studio into a practical onboarding and trust-building surface, not just a route list.

## Goal

Deliver a guided Agent Studio experience where each agent is:

- LLM-enabled
- prompt-defined
- tested in isolation with mocked inputs
- tuned for output quality before any multi-agent interaction work

Structured-output baseline for all Phase 1 agents:

- Responses must use a stable structured envelope (`contract_version`, `agent_id`, `status`, `reason_code`, `run`, `llm`).
- Domain payloads must be typed and structured (for example `plan`, `board`, `consensus`, `simulation`, `memory_context`, `recommendations`, `release_decision`).
- Free-form text can exist only as nested fields inside typed objects, never as the primary contract.

## Delivery Sequence (Hard Order)

Phase 1 must be completed first:

- Implement LLM execution for each agent so every agent can run individually in Agent Studio.
- Validate each agent in isolation via mocked-input integration tests.

Phase 2 starts only after Phase 1 is complete:

- Introduce cross-agent interaction/orchestration patterns where agents collaborate to solve compound tasks.
- Phase 2 implementation is explicitly deferred to the next epic (separate planning and delivery track).

## Record

- This epic is dedicated to **Phase 1 only** (single-agent LLM implementation and isolated validation).
- **Phase 2** (multi-agent interaction/orchestration) will be handled in the **next epic**.

## Phase 1 Agents In Scope

This epic applies to these released agents:

- `marketer-strategist`
- `menu-profit-intelligence`
- `multi-agent-consensus`
- `what-if-simulation`
- `agent-memory-tracker`
- `feedback-reranker`
- `learning-release-loop`

## Strategic Implementation Order (Phase 1)

Implement in this order:

1. `marketer-strategist`
2. `menu-profit-intelligence`
3. `feedback-reranker`
4. `learning-release-loop`
5. `agent-memory-tracker`
6. `what-if-simulation`
7. `multi-agent-consensus`

Rationale:

- Start with highest direct business-value agents for marketer and analyst workflows.
- Then implement learning-quality controls (`feedback-reranker`, `learning-release-loop`).
- Add memory continuity after base single-agent outputs are stable.
- Leave more advanced reasoning surfaces (`what-if-simulation`, `multi-agent-consensus`) to the end of Phase 1.

## Naming Recommendation

Preferred name: **Agent Studio Exploration Lab**  
Why:
- clearer than "The Agent Studio" for this epic scope
- emphasizes hands-on testing and learning
- aligns with trust/evaluation purpose of this phase

## In Scope (MVP)

- Agent overview grid with clear agent purpose, status, and persona relevance.
- LLM-backed execution for each released agent (not deterministic-only stubs).
- Prompt creation per agent (system + instruction template + output-format constraints).
- Per-agent detail pages that show:
  - business purpose
  - input contract summary
  - output contract summary
  - sample output schema
  - run/test controls
- "Run with sample context" and "Run with selected analytics context" flows.
- Consistent trust metadata display on outputs:
  - confidence
  - readiness
  - evidence/lineage pointers
- Basic run history panel per agent/detail page.
- Per-agent prompt/runtime contract with versioned model configuration.
- Guardrailed LLM invocation policy (timeouts, fallback behavior, blocked-state messaging).
- Global mechanical test mode via env flag to disable live LLM calls and force deterministic fallback paths.
- Test-first agent implementation via integration tests with mocked required inputs.
- Prompt-tuning loop per agent using isolated mocked-input integration tests.
- UX states:
  - no context selected
  - loading
  - ready
  - degraded/low-readiness
  - blocked by guardrail

## Out of Scope (for this epic)

- Full autonomous orchestration across multiple agents in one click (until all single-agent LLM paths are complete and validated).
- Advanced prompt IDE/editor for non-engineers.
- Cross-tenant benchmarking and advanced observability dashboards.

## User Value

### Restaurant Marketer
- quickly learn which agent helps with campaign planning
- preview output quality before using recommendations in scheduler

### Menu Analyst
- validate action-board style outputs and evidence fields
- compare outputs against deterministic matrix/heatmap/pairs context

### Team Lead / Operator
- onboard team members faster via guided per-agent exploration
- reduce misuse by clarifying intended inputs/outputs

## MVP Stories

1. **AST-01: Agent Card Information Standard**
- Add consistent card metadata (persona, purpose, trust scope, status).

2. **AST-02: Per-Agent Input/Output Contract Panels**
- Add readable input/output contract panels with schema snippets.

3. **AST-03: Sample Context Runner**
- One-click run using seeded/safe sample context for each agent.

4. **AST-04: Selected Context Runner**
- Run agent against selected location + analytics context from UI filters.

5. **AST-05: Output Trust Panel**
- Standard output panel for confidence/readiness/evidence/lineage.

6. **AST-06: Agent Run History (Lightweight)**
- Show recent runs and status per agent page.

7. **AST-07: Comparison View (Single Session)**
- Compare two runs of the same agent for changed assumptions/context.

8. **AST-10: Prompt and Model Contract Versioning**
- Define prompt/input/output contracts and versioning per agent (`v1` baseline).
- Deliver prompt templates for each released agent with strict output schema requirements.

9. **AST-13: Mocked-Input Integration Test Baseline per Agent**
- For each released agent, implement integration tests that mock all required inputs and validate:
  - contract-compliant output shape
  - trust metadata fields
  - fallback/degraded behavior under controlled failure scenarios

10. **AST-09: LLM Runtime Integration per Agent**
- Implement model invocation for each released agent with provider abstraction and retries/timeouts.

11. **AST-11: LLM Guardrails and Fallback**
- Add structured fallback mode when model/provider fails or confidence is below threshold.

12. **AST-16: LLM Disable Switch (Mechanical Test Mode)**
- Add runtime config/env flag (for example `AGENTS_LLM_ENABLED=false`) to disable live LLM calls globally and run deterministic mechanical mode for regression and UI testing.

13. **AST-12: LLM Evaluation Harness**
- Add integration tests and E2E checks validating LLM response shape, trust metadata, and deterministic fallbacks.

14. **AST-15: Prompt Tuning Loop per Agent (Isolated)**
- Iteratively tune each agent prompt using mocked-input integration scenarios until acceptance thresholds are met for:
  - schema compliance
  - actionability/readability
  - trust metadata completeness
  - fallback correctness

15. **AST-08: Validation and E2E Gate**
- Add dedicated E2E suites and release checks for Agent Studio flows.

16. **AST-14: Phase-2 Handoff Readiness Checklist**
- Prepare and enforce a readiness checklist for the next epic (no multi-agent implementation in this epic):
  - all targeted single agents are LLM-enabled
  - mocked-input integration tests pass per agent
  - per-agent run surfaces are stable in Agent Studio
  - rollout flag + fallback policy are documented

## Acceptance Criteria

- Agents app integration tests pass before web integration is enabled.
- Each agent is implemented through integration tests with mocked required inputs (test-first gate).
- Single-agent LLM execution is available for each released agent before any multi-agent interaction implementation starts.
- Each released agent has a prompt definition and tuning evidence from isolated mocked-input tests.
- Every released agent has a detail page with:
  - purpose
  - input contract
  - output contract
  - runnable test control
- Every released agent has an LLM execution path available behind rollout flag, with deterministic fallback.
- Global runtime switch can disable LLM calls for mechanical testing without breaking agent pages, trust panels, run history, or comparison flows.
- Output trust metadata is visible and consistent across agents.
- Users can run each agent with sample context without manual API calls.
- Model failure/degraded paths are explicit and user-safe (fallback or blocked state).
- Integration tests do not depend on live analytics/db state for core agent behavior validation.
- All agent responses (normal, degraded, blocked, fallback, mechanical mode) remain contract-structured and machine-parseable.
- Dedicated E2E coverage for:
  - overview grid discoverability
  - per-agent run flow
  - trust state rendering
  - blocked/degraded state behavior

## Test Execution Rule (Per Story)

For every story in this epic:

- Add or update **agents integration tests** when agent/runtime/contract behavior changes.
- Add or update **web E2E tests** whenever UI flows, route behavior, or cross-service integration paths are affected.
- Add or update **unit tests** when isolated logic (formatters, mappers, validation rules, ranking/policy helpers, UI state helpers) is introduced or changed.
- If a story is purely documentation/non-functional, explicitly state why no new tests are needed.

## Quality Thresholds (Prompt Tuning Gate)

Per in-scope agent, prompt tuning is considered complete only when:

- schema compliance: `100%` on mocked integration test set
- trust metadata completeness: `100%`
- fallback correctness (provider failure + guardrail failure scenarios): `100%`
- actionability/readability review score: `>= 4/5`

## LLM Performance and Cost Guardrails

Per in-scope agent, release candidates must record and satisfy:

- p95 response latency target
- max tokens per run
- max estimated cost per run

Required run metadata fields:

- `model_id`
- `prompt_version`
- `token_usage`
- `latency_ms`
- `fallback_used`
- `guardrail_state`

## Release Definition of Done

- Agent Studio supports practical exploration for all released agents.
- Manual onboarding path exists: "open agent -> understand -> run -> inspect output."
- No regression to existing analytics dropdown pages or existing agent endpoints.
- User manual updated with Agent Studio exploration workflow.

## Risks and Mitigations

- Risk: UI becomes crowded and hard to scan.
  - Mitigation: enforce a standard card/detail layout and progressive disclosure.
- Risk: users treat exploratory output as production decision without trust checks.
  - Mitigation: trust panel and blocked/degraded states are always explicit.
- Risk: test flakiness from service dependencies.
  - Mitigation: use existing managed E2E service lifecycle and per-test data policy.

## Dependencies

- Existing agent endpoints and contracts in `apps/agents`.
- Existing Agent Studio routes in `apps/web/app/(protected)/agents`.
- Existing E2E service runner and data setup helpers in `apps/web/scripts` and `apps/web/e2e/_helpers`.
- LLM provider credentials/runtime configuration for local and CI environments.

## Mocked Integration Test Policy

Each in-scope agent must include a golden mocked-input integration test set with:

- happy path scenario
- low-readiness scenario
- blocked/guardrail scenario
- provider failure scenario
- malformed or incomplete upstream context scenario

These tests are mandatory CI gates before web integration for that agent.

LLM-call rule for this epic:

- upstream/data/tool inputs are mocked
- LLM call path is validated with real provider/model in live-integration runs

Clarification:

- Phase 1 includes both:
  - deterministic mocked integration gates (required for CI stability)
  - isolated live-LLM evaluation runs per agent (for real model behavior validation)
- Phase 2 starts only when these single-agent live-LLM validations are complete.

Two-layer execution policy:

1. CI default gate:
  - mocked inputs + mocked LLM responses (fast/stable required gate)
2. Live LLM integration suite:
  - mocked inputs + real LLM call (scheduled or opt-in release gate)

Both layers must validate:

- contract-compliant output shape
- trust metadata completeness
- fallback/degraded behavior

## Engineering Rule (Implementation Order)

For each agent in this epic:

1. Define/lock input and output contracts.
2. Define prompt v1 (system prompt + task instructions + schema constraints).
3. Create integration tests with mocked required inputs (happy path + degraded/fallback path).
4. Implement/adjust LLM runtime until integration tests pass.
5. Tune prompts iteratively against mocked-input test set until quality threshold is met.
6. Integrate agent into web routes and Agent Studio UI.
7. Add/refresh story E2E coverage.

Cross-agent interaction rule:

- Do not implement agent-to-agent collaboration until all target single agents complete steps 1-5 above.
