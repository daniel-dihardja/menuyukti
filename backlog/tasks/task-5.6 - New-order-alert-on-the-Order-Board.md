---
id: TASK-5.6
title: New-order alert on the Order Board
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T16:08:00Z'
updated_date: '2026-10-26T16:19:00Z'
labels:
  - web
  - orders
dependencies:
  - TASK-5.3
references:
  - apps/web/app/(protected)/services/digital-menu/
parent_task_id: TASK-5
priority: medium
type: enhancement
ordinal: 17000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Counter staff may not watch the board continuously. A lightweight new-order signal (visual badge and optional sound) reduces missed tickets without requiring realtime infrastructure beyond polling.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 When a new digital-menu order appears while the board is open, staff get a clear visual indication
- [x] #2 Optional audible alert can be toggled (default sensible for a noisy kitchen/counter)
- [x] #3 Alert behavior does not require GraphQL subscriptions (polling/refresh is acceptable)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Detect new ids on poll; badge + optional localStorage sound (default off).
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Order board polls every 5s; new order ids flash a badge and optionally play a soft chime (localStorage toggle, default off). No GraphQL subscriptions.

<!-- SECTION:FINAL_SUMMARY:END -->
