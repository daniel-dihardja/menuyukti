---
id: TASK-9.4
title: Sync Square orders and refunds into analytics OrderFacts
status: To Do
assignee: []
created_date: '2026-10-28T13:28:00Z'
updated_date: '2026-10-28T13:57:00Z'
labels:
  - square
  - graphql
  - analytics
dependencies:
  - TASK-9.1
  - TASK-9.3
  - TASK-9.8
parent_task_id: TASK-9
priority: high
type: feature
ordinal: 33000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

AI analytics need Square POS sales in the same pipelines as existing `OrderFact` analytics. After SDK scaffolding (TASK-9.8) and location mapping, implement initial sync/backfill for the window decided in TASK-9.1, with refunds deducted from displayed sales.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Initial sync imports Square orders for mapped locations into MenuYukti analytics storage used by existing KPI/advisor charts
- [ ] #2 Refunds are applied so sales amounts are not overstated vs Square
- [ ] #3 Sync uses pagination and exponential backoff on rate limits
- [ ] #4 Failed syncs are visible to operators (or logged with a recoverable retry path) without corrupting partial runs
- [ ] #5 Tests cover mapping of sample Square order/refund payloads into analytics rows
<!-- AC:END -->
