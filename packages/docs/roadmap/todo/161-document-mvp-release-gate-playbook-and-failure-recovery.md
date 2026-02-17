# Story 161: Document MVP Release-Gate Playbook and Failure Recovery

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Publish a practical playbook for running the MVP release gate and recovering from common failures.

## Why This Matters
- Teams need a consistent runbook to avoid ad-hoc release decisions.
- Fast failure recovery improves throughput without reducing quality.
- Keeps MVP scope discipline by codifying what is required vs out-of-scope.

## Scope
- Document command sequence for local and CI release validation.
- Document pass/fail interpretation of coverage report and pass-rate metrics.
- Document common failure cases and standard recovery actions.

## Acceptance Criteria
- Manual/roadmap docs include step-by-step release-gate execution.
- Failure recovery table exists for top issues (service boot, seed fail, suite fail).
- Docs explicitly state post-MVP features are excluded from MVP gate.

## Deliverables
- Manual update section for MVP release-gate playbook.
- Roadmap/spec wording updates if needed for clarity.
- Quick checklist usable during release cut.
