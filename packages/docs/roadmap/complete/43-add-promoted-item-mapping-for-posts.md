# Story 43: Add Promoted Item Mapping for Posts

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Map each Instagram post to one or more promoted menu items in a deterministic way.

## Why This Matters
- Sales attribution requires post-to-item linkage.

## Scope
- Add mapping table between posts and canonical menu items.
- Add simple write path (API endpoint) to upsert mappings.
- Enforce uniqueness and branch consistency constraints.

## Acceptance Criteria
- Post-to-item mappings can be created/updated idempotently.
- Duplicate mapping writes are prevented.
- Mapping records are available for attribution SQL joins.

## Deliverables
- Schema + migration for mapping table.
- API endpoint for mapping upsert.
