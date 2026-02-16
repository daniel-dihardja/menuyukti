# Story 21: Add Run Freshness Metadata in Read API

## Goal
Help marketers see whether matrix insights are fresh enough to act on.

## Scope
- Include `pipeline_run_id`, `ingested_at_utc`, and `quality_status` in matrix read response.
- Add `data_freshness_minutes` computed field.
- Expose freshness warnings when SLA is breached.

## Acceptance Criteria
- Matrix response always includes freshness metadata.
- Frontend can render “last updated” and freshness warning.
- Metadata values map to the exact warehouse run.

## Deliverables
- API response contract update.
- Freshness computation helper.

## Status
`complete`
