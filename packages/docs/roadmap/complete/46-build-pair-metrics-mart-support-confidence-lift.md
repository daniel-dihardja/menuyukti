# Story 46: Build Pair Metrics Mart (Support/Confidence/Lift)

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Expose analyst-grade pair metrics including support, confidence, and lift.

## Why This Matters
- Menu analysts need statistically grounded pairing signals, not raw counts.

## Scope
- Build mart/view aggregating pair facts into support/confidence/lift.
- Add minimum sample-size threshold field and noise flag.
- Include branch/time filters.

## Acceptance Criteria
- Metrics formulas match documented contract definitions.
- Output includes threshold/noise flags.
- API endpoint returns pair metrics for analyst workflows.

## Deliverables
- Pair metrics mart SQL + API route.
