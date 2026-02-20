# Story PTL-12: Codex Scoring Matrix and Iteration Artifact Contract

## Story Metadata
- Created Date: 2026-02-20
- Completed Date: 2026-02-20
- Status: `complete`
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `5`
- Execution Order: 2 (per reopened execution order after PTL-10)

## Goal
Define the Codex-applied scoring matrix and file-based artifact contract so each iteration can be invoked, scored, and consumed by the next loop step.

## Why This Matters
- Makes scoring transparent, auditable, and reusable by downstream steps.
- Prevents hidden in-memory coupling between invoke/score/improve stages.

## Scope
- Define scoring matrix dimensions, weights, and threshold policy for Codex scoring.
- Define runtime artifact file contract:
  - `output.json` (agent raw output + metadata)
  - `score.json` (Codex scoring result + dimension breakdown + pass/fail)
  - `iteration-summary.json` (loop-level decision payload)
- Define canonical run path convention per iteration, for example:
  - `apps/agents/pilot/prompt-tuning/outputs/runs/<run_id>/iter-<n>/...`
- Define read-back contract so improver step can consume `score.json` deterministically.

## Acceptance Criteria
- Scoring matrix is versioned and documented.
- `output.json`, `score.json`, and `iteration-summary.json` schemas are documented and versioned.
- File path conventions are explicit and used consistently by pilot runtime.
- Score artifact includes enough detail for improvement step:
  - total score
  - dimension scores
  - failed checks
  - threshold evaluation
- Documentation clearly explains how loop reads artifacts from one iteration to the next.

## Deliverables
- Scoring matrix specification artifact.
- Runtime artifact schema specification.
- Implementation notes for run-directory and per-iteration file layout.
- Sample artifact blueprint linking back to `packages/docs/planning/blueprints/iteration-artifacts-samples.md`.

## Implementation Notes
- Added `apps/agents/src/agent/pilot/prompt_tuning.py` helpers that load the Codex scoring matrix + artifact schema, persist `output.json`/`score.json`/`iteration-summary.json` per iteration, and annotate each iteration row with failed dimensions/checks.
- Replaced pilot specs under `apps/agents/pilot/prompt-tuning/specs/` so the matrix weights and artifact schema mirror the new scoring dimensions and required summary fields.
- Expanded unit tests (`apps/agents/tests/unit_tests/test_prompt_tuning_pilot_scoring_contracts.py`, `apps/agents/tests/unit_tests/test_prompt_tuning_pilot_loop.py`) to exercise the updated helpers and to pass an injectable artifacts base directory.
- Added the sample blueprint `packages/docs/planning/blueprints/iteration-artifacts-samples.md` and linked it from the story so future implementers can follow the canonical run/iteration payloads.

## Testing
- `python3 -m pytest apps/agents/tests/unit_tests/test_prompt_tuning_pilot_scoring_contracts.py apps/agents/tests/unit_tests/test_prompt_tuning_pilot_loop.py` *(fails: `pytest` not installed locally, and `python3 -m pip install pytest` could not reach PyPI (`[Errno 8] nodename nor servname provided, or not known`).)*

## Sample Artifact Reference
- Include an annotated `score.json` and `iteration-summary.json` example so the team can trace how the scoring matrix scores each dimension and how the loop records stop reasons.
- Reference the blueprint when drafting documentation or tests that consume the artifact contract.
