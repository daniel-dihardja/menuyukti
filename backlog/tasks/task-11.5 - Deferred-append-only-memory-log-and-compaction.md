---
id: TASK-11.5
title: 'Deferred: append-only memory log and compaction'
status: To Do
assignee:
  - '@danieldihardja'
created_date: '2026-10-29T11:18:00Z'
labels:
  - graphql
  - agents
  - deferred
dependencies:
  - TASK-11.3
parent_task_id: TASK-11
priority: low
type: enhancement
ordinal: 50000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

A single rolling blob is enough to prove cross-thread memory. Over time the model may need append-only notes plus periodic compaction so history is auditable and the active summary stays short. That design should wait until MVP write quality is known.

Out of MVP unless product prioritizes after TASK-11.3.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Out of MVP scope unless product prioritizes after rolling-memory tools ship
- [ ] #2 If resumed: append and compact have an explicit authorship, retention, and size model
- [ ] #3 If resumed: compaction cannot silently drop owner brief fields (memory stays separate from quickProfile)
<!-- AC:END -->
