# Story PTL-10: Test Agent Definition and Runtime Surface (Pilot-Only)

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `5`

## Goal
Create a dedicated pilot test agent with explicit task definition and stable runtime surface to serve as the tuning target.

## Implementation Priority
First story in reopened epic execution order.

## Why This Matters
- Makes the tuning target explicit and isolated from existing production agents.
- Prevents ambiguity in prompt tuning by fixing the task, input shape, and output shape first.

## Scope
- Define test-agent task statement and non-goals.
- Define test-agent request contract (inputs) and response contract (outputs).
- Use contract that enables both strict binary and graded rubric scoring.
- Implement test-agent runtime module/API endpoint (pilot-only surface).
- Ensure runtime metadata fields are returned for each invocation.
- Keep this agent isolated from global/production agent flows.

## Acceptance Criteria
- Test-agent task definition is documented and versioned.
- Test-agent input/output contracts are documented and validated in tests.
- Test-agent runtime endpoint/module can be invoked with mocked fixture input.
- Response includes contract fields and runtime metadata required by tuning loop.
- Story output is pilot-only and does not modify existing production agent contracts.

## Deliverables
- Test-agent contract spec (task/input/output).
- Test-agent runtime implementation (module + endpoint/runner wiring).
- Unit/integration tests for contract validation and invocation.

## Selected Contract Reference
- `packages/docs/contracts/AGENT_PROMPT_TUNING_TEST_AGENT_V1.md`

## Concrete Example (For Implementation)

### Task
- `campaign-offer-brief-generator`
- Given mocked campaign context, generate a structured promo brief with one primary action and one fallback action.

### Input Contract Example
- `contract_version: "v1"`
- `scenario_id: string`
- `restaurant_name: string`
- `menu_item: string`
- `target_audience: string`
- `tone: "premium" | "friendly" | "playful"`
- `objective: "traffic" | "margin" | "awareness"`
- `daypart: "morning" | "lunch" | "afternoon" | "evening"`
- `price_band: "budget" | "mid" | "premium"`
- `inventory_pressure: "low" | "medium" | "high"`
- `candidate_actions: string[]`
- `must_include_terms: string[]`
- `forbidden_phrases: string[]`
- `evidence_facts: string[]`

### Output Contract Example
- `headline: string`
- `primary_action: string`
- `fallback_action: string`
- `audience_hook: string`
- `justification: string`
- `risk_note: string`
- `hashtags: string[]`

### Scoring-Friendly Properties
- Binary-testable:
  - required fields present
  - actions selected from `candidate_actions`
  - headline includes `menu_item`
  - no `forbidden_phrases`
  - hashtags count is `2..4`
- Rubric-testable:
  - tone alignment
  - actionability
  - justification quality
  - readability/conciseness
