---
id: TASK-11.4
title: Optional venue UI to view or clear advisor memory
status: To Do
assignee:
  - '@danieldihardja'
created_date: '2026-10-29T11:18:00Z'
labels:
  - web
dependencies:
  - TASK-11.1
references:
  - apps/web/app/(protected)/analytics/locations
  - apps/web/components/chat
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

- [ ] #1 Authenticated owner can view current advisor memory for the selected location from operator web
- [ ] #2 Authenticated owner can clear advisor memory without editing owner quickProfile
- [ ] #3 UI copy distinguishes advisor memory from owner location notes / brief
<!-- AC:END -->
