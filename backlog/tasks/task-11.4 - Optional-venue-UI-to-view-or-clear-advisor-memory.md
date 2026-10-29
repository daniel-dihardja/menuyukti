---
id: TASK-11.4
title: Optional venue UI to view or clear advisor memory
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-29T11:18:00Z'
updated_date: '2026-10-29T14:08:00Z'
labels:
  - web
dependencies:
  - TASK-11.1
references:
  - apps/web/app/(protected)/analytics/locations
  - apps/web/components/chat
documentation:
  - backlog/docs/security/doc-3 - Chat-advisor-memory-management.md
parent_task_id: TASK-11
priority: medium
type: enhancement
ordinal: 49000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Operators may want to see or wipe what the advisor stored about a venue without scrolling chat history. Chat-only memory is fine for MVP; a thin read/clear surface in the venue workspace builds trust and recovery when memory goes stale or wrong.

Ship only if product wants visibility in the same release as tools; otherwise keep deferred behind chat tools.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Authenticated owner can view current advisor memory for the selected location from operator web
- [x] #2 Authenticated owner can clear advisor memory without editing owner quickProfile
- [x] #3 UI copy distinguishes advisor memory from owner location notes / brief
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Find advisor page chrome (toolbar / venue rail) and existing location GraphQL client patterns.
2. Add web GraphQL read + clear (updateLocationAdvisorMemory with empty content) for selected location.
3. Place a clear (and light view) control on the advisor chat page; copy distinguishes advisor memory vs owner brief.
4. Add i18n strings + focused tests; smoke via unit/RTL where practical.
5. Update doc-3 briefly if needed.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Added Venue-tab AdvisorWorkspaceMemoryPanel (view + clear confirm). BFF GET/DELETE /api/locations/:id/advisor-memory → GraphQL advisorMemory / updateLocationAdvisorMemory(""). i18n distinguishes from owner brief. Vitest route tests 3/3; web tsc clean. doc-3 updated.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Operators can view and clear location advisor memory from the advisor Venue workspace tab (above the location form). Clear uses empty-content mutation and does not touch quickProfile. Verified with API route tests; open Venue tab on /advisor with a selected venue to smoke-test UI.

<!-- SECTION:FINAL_SUMMARY:END -->
