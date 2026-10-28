---
id: TASK-9.5
title: Keep Square sales fresh with incremental sync or webhooks
status: To Do
assignee: []
created_date: '2026-10-28T13:28:00Z'
updated_date: '2026-10-28T13:57:00Z'
labels:
  - square
  - graphql
dependencies:
  - TASK-9.4
parent_task_id: TASK-9
priority: medium
type: feature
ordinal: 34000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

One-shot backfill is not enough for an always-on analytics product. Need ongoing freshness via incremental poll and/or Square webhooks, using the freshness default chosen in TASK-9.1.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 New and updated Square orders/refunds for connected locations appear in MenuYukti within the freshness window agreed in TASK-9.1
- [ ] #2 Duplicate delivery (webhook retry or overlapping poll) does not double-count sales
- [ ] #3 Disconnect stops incremental processing for that connection
<!-- AC:END -->
