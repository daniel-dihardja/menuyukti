# TODO 02: Introduce Typed Contract Models

## Goal
Add explicit typed contract models for analytics outputs while keeping backward compatibility.

## Commit Scope
- Add Pydantic models for canonical `v1` outputs:
  - sales summary
  - menu heatmap
  - matrix distribution
  - matrix item output shape if needed
- Support aliases so legacy payloads can still parse.

## Out Of Scope
- No producer output changes yet.
- No endpoint behavior changes yet.

## Acceptance Criteria
- New models compile and are importable.
- Legacy payload parsing still works through aliases.
- Existing tests remain green.

## Validation
- `uv run pytest packages/marketing-engine/tests -q`

## Status
`todo`
