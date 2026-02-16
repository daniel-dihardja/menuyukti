# TODO 07: Add Contract Tests And Freeze V1

## Goal
Make canonical schema behavior enforceable in CI and lock `v1` contract semantics.

## Commit Scope
- Add contract tests for canonical output keys/types.
- Add compatibility tests for legacy payload acceptance.
- Define CI failure behavior for contract-breaking changes without version bump.
- Mark canonical `v1` as frozen.

## Out Of Scope
- New feature work unrelated to schema contracts.

## Acceptance Criteria
- Contract tests exist and run in CI.
- Canonical payload shape is validated deterministically.
- Schema change process is documented (version bump required for breaks).

## Validation
- `uv run pytest packages/marketing-engine/tests -q`
- CI check confirms contract suite execution.

## Status
`todo`
