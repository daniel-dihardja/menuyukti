# Story PTL-07: Codex Prompt Improver Protocol Spec (Pilot-Only)

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `3`

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

## Acceptance Criteria
- A versioned contract/spec doc exists for the pilot Codex improver protocol.
- Contract explicitly defines required input and output fields.
- Contract includes guardrails to preserve required output keys and data-policy constraints.
- Contract is referenced by implementation story PTL-08.

## Deliverables
- Pilot Codex improver protocol document.
- Example improver request/response payloads.
- Guardrail and scope notes.
