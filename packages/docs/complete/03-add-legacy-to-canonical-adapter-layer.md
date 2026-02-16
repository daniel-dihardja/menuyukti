# TODO 03: Add Legacy To Canonical Adapter Layer

## Goal
Introduce adapters that normalize legacy payloads into canonical `v1` models at system boundaries.

## Commit Scope
- Add adapter functions for legacy key/type normalization, including:
  - camelCase to snake_case mapping
  - string hour to int conversion
  - distribution key normalization
- Wire adapters in API/service boundary points.

## Out Of Scope
- No transform producer rewrites yet.

## Acceptance Criteria
- Legacy payloads successfully normalize to canonical models.
- Boundary integration remains functional.
- Focused adapter unit tests are added.

## Validation
- `uv run pytest packages/marketing-engine/tests -q`
- Adapter-specific tests pass.

## Status
`todo`
