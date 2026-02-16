# TODO 04: Emit Canonical Heatmap Shape From Producer

## Goal
Update heatmap producer output to canonical `v1` schema while preserving compatibility.

## Commit Scope
- Refactor `calculate_menu_heatmaps` output keys/types to canonical contract.
- Ensure `hour` is integer and keys are snake_case.
- Keep compatibility behavior through adapters/aliases during transition.

## Out Of Scope
- Full deprecation removal of legacy shape.

## Acceptance Criteria
- Producer emits canonical heatmap payload.
- Existing downstream flows still function through compatibility layer.
- Tests updated and passing.

## Validation
- `uv run pytest packages/marketing-engine/tests -q`
- Endpoint smoke check for analytics flow.

## Status
`todo`
