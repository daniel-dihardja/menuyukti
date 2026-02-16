# Story 19: Add Quality Gate Threshold Policy

## Goal
Stop bad uploads from polluting marketer dashboards.

## Scope
- Define reject-rate threshold policy.
- Block publish when threshold fails.
- Mark run as `failed_quality_gate` with details.

## Acceptance Criteria
- Runs above threshold do not publish to marts/read path.
- API communicates quality gate failure reason clearly.
- Gate threshold is configurable per environment.

## Deliverables
- Quality gate policy config.
- Runtime enforcement update.

## Status
`complete`
