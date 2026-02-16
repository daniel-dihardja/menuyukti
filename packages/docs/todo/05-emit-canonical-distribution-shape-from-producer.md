# TODO 05: Emit Canonical Distribution Shape From Producer

## Goal
Align matrix distribution producer output with canonical `v1` field names.

## Commit Scope
- Update distribution output keys from legacy names to:
  - `item_count`
  - `item_share`
  - `margin_share`
- Preserve temporary compatibility via adapters/aliases.

## Out Of Scope
- Removal of compatibility handling.

## Acceptance Criteria
- Producer emits canonical distribution fields.
- Downstream model parsing is stable.
- Tests updated and green.

## Validation
- `uv run pytest packages/marketing-engine/tests -q`
- Matrix endpoint smoke check.

## Status
`todo`
