# Story PTL-11: Iterating Prompt and Mocked Input Invocation Loop

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `5`

## Goal
Implement the loop that applies iterating prompt versions to mocked input fixtures and invokes the pilot test agent each cycle.

## Why This Matters
- Connects prompt revision output to measurable execution behavior.
- Ensures every iteration is evaluated using the same mocked inputs for fair scoring.

## Scope
- Bind current prompt candidate to each mocked fixture case.
- Invoke PTL-10 test agent for each case and collect response metadata.
- Write agent response artifact to `output.json` per iteration/case.
- Codex reads `output.json`, applies scoring matrix, and persists `score.json`.
- Produce `iteration-summary.json` for loop decision state.
- Feed failure diagnostics to Codex improver for next prompt candidate.
- Repeat until pass criteria or max iterations.

## Acceptance Criteria
- Each iteration executes test-agent calls using mocked fixtures only.
- Per-iteration report contains:
  - prompt version
  - output artifact path
  - score artifact path
  - per-case scores
  - total score
  - baseline delta
  - pass/fail
  - stop-condition flags
- Below-threshold iterations trigger Codex-based prompt improvement.
- Loop ends on pass criteria or explicit max-iteration fail condition.

## Deliverables
- Iteration runner wiring between prompt candidate, mocked fixtures, and test-agent invocation.
- Updated loop report schema with per-iteration execution evidence and artifact paths.
- Test coverage for pass path and below-threshold repeat path.
