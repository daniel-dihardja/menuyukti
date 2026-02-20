# Story PTL-08: Codex-Driven Prompt Improvement Integration

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `5`
- Execution Order: 5 (per reopened execution order after PTL-07)

## Goal
Integrate Codex-generated prompt revisions into the pilot loop so below-threshold iterations are improved by Codex orchestration.

## Why This Matters
- Implements the core workflow requirement: Codex analyzes and improves prompt every iteration.
- Replaces heuristic-only behavior with a spec-driven improvement step.

## Scope
- Add Codex-driven improver step between scoring and next iteration run.
- Pass structured iteration diagnostics to Codex through artifact inputs.
- Validate revised prompt contract before using next candidate.
- Keep deterministic scoring gate unchanged as the final pass/fail authority.

## Feedback Loop Example
- Reference the happy/failing artifact samples so readers can see exactly when the improver should run and how the new prompt version is stitched back into the loop.
- Document the file path and metadata updates (prompt version, candidate tag, improved-instruction summary) that PTL-08 must produce for PTL-09 validation and PTL-10 consumer readiness.
- Explain how `improver-input.json`/`improver-output.json` (see `packages/docs/planning/blueprints/codex-improver-protocol.md` and the iteration artifact blueprint) carry the diag/contract the improver needs and record the candidate that will be reused in the next iteration.

## Acceptance Criteria
- For below-threshold iterations, next prompt candidate comes from Codex improver output.
- Iteration artifacts include improver input/output traces (or safe summary).
- Invalid improver output is handled safely and does not corrupt loop state.
- Mocked-fixture-only input policy remains enforced.

## Deliverables
- Updated pilot loop implementation using Codex improver step.
- Updated CLI/report artifacts showing improver metadata per iteration.
- Implementation notes in story closure evidence.

## Implementation Notes
- Added Codex improver orchestration (`CodexImproverClient`) that emits `improver-input.json`/`improver-output.json` and records candidate metadata so the loop can safely consume Codex output.
- The iteration artifacts now include the per-iteration Improver payloads, candidate ID, rationale, and `next_action` flags such as `improver_failed` when Codex returns invalid output.
- Tests expanded (`apps/agents/tests/unit_tests/test_prompt_tuning_pilot_loop.py`) to assert the new artifacts exist and contain the fields required by PTL-08 and PTL-09 documentation.

## Testing
- `python3 -m pytest apps/agents/tests/unit_tests/test_prompt_tuning_pilot_scoring_contracts.py apps/agents/tests/unit_tests/test_prompt_tuning_pilot_loop.py` *(fails because `pytest` is not installed locally and `python3 -m pip install pytest` cannot reach PyPI – `[Errno 8] nodename nor servname provided, or not known`).*
