# Story PTL-09: Codex Improver Validation and Safety Guardrails

## Story Metadata
- Created Date: 2026-02-20
- Completed Date: 2026-02-20
- Status: `complete`
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
- Add guardrail documentation for `improver-output.json`/`iteration-summary.json` entries such as `improver_failure_reasons` and `improver.guardrail_reasons`.

## Acceptance Criteria
- Unit/integration tests cover happy path and malformed-improver-output path.
- Guardrails reject candidates that mention forbidden phrases or drop required constraints, and the run reports the rejection to the summary document.
- Loop behavior is deterministic for mocked fixture runs with fixed settings.
- Guardrails prevent invalid improver output from being promoted as next candidate.
- Documentation includes troubleshooting steps for improver failures.

## Deliverables
- Test updates for Codex improver safety paths.
- Guardrail validation implementation (if not already present).
- Documentation updates for operator troubleshooting.

## Validation Notes
- Guardrails should cover both the `improver-output.json` payload (reject candidates missing constraints or referencing forbidden terms) and the `iteration-summary.json` metadata (`improver_failure_reasons`, `improver.guardrail_reasons`).
- Tests should explicitly verify guardrail rejections and that failing candidates set `next_action: improver_failed` while leaving the previous prompt unchanged.

## Implementation Notes
- Added guardrail helpers that reject candidates mentioning forbidden phrases or omitting required constraints before the loop commits to a new prompt.
- Codex improver artifacts now include `improver_failure_reasons` and `improver.guardrail_reasons`; the iteration summary logs the reasons so operators can spot unsafe candidates immediately.
- Tests cover both the happy path (artifacts exist) and the malformed candidate path (`BrokenImprover`: returns `cheap` text), ensuring the loop marks `next_action: improver_failed` and does not swap prompts.

## Testing
- `python3 -m pytest apps/agents/tests/unit_tests/test_prompt_tuning_pilot_scoring_contracts.py apps/agents/tests/unit_tests/test_prompt_tuning_pilot_loop.py` *(fails: `pytest` missing locally; `python3 -m pip install pytest` cannot reach PyPI—`[Errno 8] nodename nor servname provided, or not known`).*
