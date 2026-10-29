---
id: TASK-11.1
title: GraphQL location advisor memory model and API
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-29T11:17:00Z'
updated_date: '2026-10-29T11:27:00Z'
labels:
  - graphql
dependencies: []
references:
  - apps/graphql
  - apps/graphql/data_sources/models/location_manual_brief_input.py
  - apps/graphql/schema/mutations/update_location_manual_brief_input.py
parent_task_id: TASK-11
priority: high
type: feature
ordinal: 46000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Chat needs a durable per-venue store for advisor-written notes that survive new threads. Persistence and authz must live in GraphQL next to location ownership — not in the agents checkpointer and not inside owner `quickProfile`.

Add a dedicated location-scoped memory record (one row per location), authenticated query + upsert/clear mutation with `require_location_owner`, and server-side size/content validation so the blob cannot grow unbounded.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Authenticated owners can read advisor memory for a location they own; non-owners get empty/denied consistent with other location fields
- [x] #2 Authenticated owners can upsert or clear advisor memory for a location they own
- [x] #3 Storage is separate from location_manual_brief_input / quickProfile
- [x] #4 Server rejects oversized or invalid payloads with a clear error
- [x] #5 Alembic migration and GraphQL tests cover ownership and upsert/clear
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add LocationAdvisorMemory model + Location relationship + exports
2. Alembic migration from g6h7i8j9k0l1
3. Domain/service validate 8000-char text; empty clears
4. Nested LocationType.advisorMemory + prefetch + mutation updateLocationAdvisorMemory
5. Delete cleanup + tests + schema.graphql
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Implemented location_advisor_memory model, Alembic h2i3j4k5l6m7, nested advisorMemory, updateLocationAdvisorMemory (8000-char cap, empty clears), delete cleanup, tests (9 passed).

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

GraphQL location advisor memory API shipped: dedicated table separate from quickProfile, owner-gated nested read + upsert/clear mutation, schema.graphql updated, tests cover empty/upsert/clear/oversize/non-owner.

<!-- SECTION:FINAL_SUMMARY:END -->
