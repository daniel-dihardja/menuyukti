# Story PTL-09: Codex Improver Validation and Safety Guardrails

## Story Metadata
- Created Date: 2026-02-20
- Status: `todo`
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `3`
- Execution Order: 6 (per reopened execution order after PTL-08)

## Goal
Add validation and guardrail coverage for Codex-improver outputs so the pilot loop remains safe, traceable, and reproducible.

## Why This Matters
- Codex-generated revisions can be malformed or unsafe without strict validation.
- Safety checks preserve reliability of the scoring-and-freeze decision path.

## Scope
- Add tests for malformed improver output and fallback handling.
- Add tests for preserved required output constraints after prompt revision.
- Ensure per-iteration reports include clear stop/failure reasons related to improver behavior.
- Update documentation to explain improver failure and recovery behavior.

## Troubleshooting Example
- Use the failing sample in `packages/docs/planning/blueprints/iteration-artifacts-samples.md` to show how the guardrail logic detects missing CTA/Menu Item coverage and how the fallback candidate is logged.
- Document what evidence (score deltas, stop reason, guardrail trigger) should appear next to each archived story so engineers instantly see if a run failed for safety reasons.

## Acceptance Criteria
- Unit/integration tests cover happy path and malformed-improver-output path.
- Loop behavior is deterministic for mocked fixture runs with fixed settings.
- Guardrails prevent invalid improver output from being promoted as next candidate.
- Documentation includes troubleshooting steps for improver failures.

## Deliverables
- Test updates for Codex improver safety paths.
- Guardrail validation implementation (if not already present).
- Documentation updates for operator troubleshooting.
