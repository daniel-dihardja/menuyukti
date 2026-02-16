# Story 42: Add Instagram Campaign and Post Identity Model

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Add canonical warehouse/public models for Instagram campaign and post identity.

## Why This Matters
- Attribution cannot work without stable campaign/post identifiers.

## Scope
- Add schema models/tables for campaign and post identity keyed by location.
- Include minimal metadata (platform post id, publish time, status, branch scope).
- Add indexes for location/time lookup.

## Acceptance Criteria
- Migration creates campaign/post identity tables.
- Tables are queryable by branch and publish window.
- No existing analytics flow regresses.

## Deliverables
- Prisma schema updates + migration.
- Minimal API types/interfaces for campaign/post identity.
