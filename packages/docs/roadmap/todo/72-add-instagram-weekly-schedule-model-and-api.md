# Story 72: Add Instagram Weekly Schedule Model and API

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`

## Goal
Create a first-class weekly scheduling data model and API so marketer decisions can be saved, edited, and reused.

## Why This Matters
- Current marketer value is decision-grade but not fully productized into a schedule workflow.
- Teams need persistent weekly plans, not only ad-hoc recommendations.

## Scope
- Add schema model/table for weekly schedule plans keyed by location and week.
- Add schema model/table for schedule entries (recommended item, daypart/time, status, rationale snapshot).
- Add read/write APIs for create, update, list, and finalize schedule plans.
- Enforce idempotency and location-scoped ownership checks on writes.

## Acceptance Criteria
- Marketer can create a weekly schedule plan for a location and week window.
- Marketer can upsert schedule entries without creating duplicate rows.
- API returns deterministic schedule payload including confidence and freshness metadata.
- Unauthorized cross-location writes are rejected.

## Deliverables
- Prisma schema updates + migration.
- `/api/instagram/schedules` route set (create/update/list/finalize).
- Contract/types updates for schedule payloads.
