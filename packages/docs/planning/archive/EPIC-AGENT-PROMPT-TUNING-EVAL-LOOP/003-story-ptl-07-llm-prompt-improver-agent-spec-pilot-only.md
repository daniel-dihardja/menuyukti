# Story PTL-07: Codex Prompt Improver Protocol Spec (Pilot-Only)

## Story Metadata
- Created Date: 2026-02-20
- Completed Date: 2026-02-20
- Status: `complete`
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `3`
- Execution Order: 4 (per reopened execution order after PTL-11)

## Goal
Define a pilot-only Codex improver protocol that describes how iteration results are converted into revised prompt candidates.

## Why This Matters
- Aligns implementation with intended Codex-orchestrated behavior.
- Prevents ad-hoc prompt edits by enforcing a contract for Codex prompt revision output.

## Scope
- Define improver input contract (current prompt, failed dimensions, scoring deltas, constraints).
- Define improver output contract (revised prompt, rationale, preserved constraints).
- Define pilot-only scope boundary (no global rollout in this story).
- Document safety rules for schema preservation and forbidden changes.

## Reference Run Integration
- Explain how a failing artifact from `packages/docs/planning/blueprints/iteration-artifacts-samples.md` maps to the improver inputs so the team can follow one concrete example from PTL-11.
- Capture how the improver output candidate is versioned (e.g., `v1-improved-2`) and what metadata fields the loop expects before it can proceed.
- Store the formalized contract in `packages/docs/planning/blueprints/codex-improver-protocol.md`, linking the sample input/output with the iteration artifacts above.

## Acceptance Criteria
- A versioned contract/spec doc exists for the pilot Codex improver protocol.
- Contract explicitly defines required input and output fields.
- Contract includes guardrails to preserve required output keys and data-policy constraints.
- Contract is referenced by implementation story PTL-08.

## Deliverables
- Pilot Codex improver protocol document.
- Example improver request/response payloads.
- Guardrail and scope notes.

## Implementation Notes
- Authored `packages/docs/planning/blueprints/codex-improver-protocol.md`, which lays out the pilot-only input/output JSON contracts, guardrails, and sample payloads that connect PTL-11 artifacts with the Codex improver step.
- Referenced the iteration artifact blueprint from PTL-12 so the improver input uses the same `failed_dimensions`, `failed_checks`, and `case_inputs` fields that the loop already produces and PTL-08 will consume.
- Documented boundaries (pilot scope, non-production guardrails, fallback behavior) so future runs can reuse the same spec without guessing which fields came from the loop.

## Testing
- None (documentation-only change).  Existing pytest runs remain blocked because `pytest` is unavailable locally (`python3 -m pytest ...` fails with “No module named pytest” and pip cannot reach PyPI: `[Errno 8] nodename nor servname provided, or not known`).
