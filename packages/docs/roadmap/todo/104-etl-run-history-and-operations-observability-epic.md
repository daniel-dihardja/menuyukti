# Story 104: ETL run history and operations observability epic

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Provide complete ETL visibility by listing all pipeline runs (including succeeded and failed) alongside recovery operations.

## Why This Matters
- Operations teams need full historical context, not only failure/recovery records.
- Marketers and analysts need confidence that successful pipelines are visible and traceable.
- Improves incident triage and post-mortem quality.

## Scope
- Add data/API/UI support for complete ETL run history with filtering, drill-down, and recovery action integration.
- Preserve existing operation workflow behavior.

## Acceptance Criteria
- Child stories 105-109 are completed.
- Users can view succeeded and failed ETL runs in product UI.
- Run history links cleanly into retry/replay workflows.

## Deliverables
- Parent epic for ETL observability story batch.

