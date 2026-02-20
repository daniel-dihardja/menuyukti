# Story PTL-12: Codex Scoring Matrix and Iteration Artifact Contract

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `5`

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
