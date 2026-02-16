# Story 44: Build Before/After Instagram Attribution Mart

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Deliver a baseline attribution mart that compares pre/post sales windows for promoted items.

## Why This Matters
- Gives marketers evidence of campaign impact using deterministic data.

## Scope
- Build SQL mart/view calculating pre-window and post-window item metrics.
- Parameterize default attribution windows (e.g., 3-day pre/post).
- Include confidence flags for insufficient sample size.

## Acceptance Criteria
- Mart outputs pre vs post quantities/revenue deltas per mapped post/item.
- Confidence field is populated from minimum sample rules.
- Mart can be queried by location and period.

## Deliverables
- Attribution mart SQL + read API endpoint.
