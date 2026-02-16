# Story 13: Deprecate Legacy JSON Storage

## Goal
Retire legacy JSON analytical storage as primary source after stable warehouse cutover.

## Scope
- Freeze writes to legacy JSON analytical fields.
- Keep read-only rollback window (for example 2 releases).
- Remove legacy fields in a controlled migration after sunset.

## Acceptance Criteria
- No new writes to legacy JSON analytics fields post-cutover.
- Rollback window is time-bound and documented.
- Final removal migration completes without data loss.

## Deliverables
- Deprecation policy and schedule.
- Sunset migration scripts.

## Status
`todo`
