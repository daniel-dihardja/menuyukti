# Story 158: Add Post Draft Data Model and Persistence Contract

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Introduce persistent storage for scheduler-linked Instagram post drafts and their lifecycle states.

## Why This Matters
- Drafts must survive page reloads and multi-user sessions.
- Lifecycle tracking is required for marketer execution and auditability.

## Scope
- Add DB tables/models for post draft and draft history.
- Link drafts to scheduler entries and analytics/location context.
- Add typed persistence contract in web app domain layer.

## Acceptance Criteria
- Draft record includes slot linkage, status, caption payload, CTA, hashtags, and timestamps.
- Status supports `draft`, `approved`, and `published` (or equivalent MVP states).
- Draft can be created and fetched by scheduler slot id.
- Unit/integration tests cover create/fetch/update status flows.

## Deliverables
- Prisma schema migration(s).
- Repository/service layer for post draft persistence.
- Tests for persistence contract.
