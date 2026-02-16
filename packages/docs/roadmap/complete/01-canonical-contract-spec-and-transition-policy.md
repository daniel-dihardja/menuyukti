# TODO 01: Canonical Contract Spec And Transition Policy

## Goal
Create a documented `v1` canonical schema contract and compatibility policy before code changes.

## Commit Scope
- Add a contract doc in `packages/docs/status`.
- Define:
  - canonical keys (snake_case)
  - field types
  - required vs optional fields
  - UTC/time handling rule
  - backward compatibility and deprecation window

## Out Of Scope
- No runtime code changes.
- No API payload changes.

## Acceptance Criteria
- A single versioned contract spec exists and is reviewed.
- It explicitly defines the canonical shape for:
  - heatmaps
  - matrix distribution
  - matrix items
  - sales analytics summary
- Transition policy is documented.

## Validation
- Documentation build/readability check.
- No tests required beyond existing baseline.

## Status
`todo`
