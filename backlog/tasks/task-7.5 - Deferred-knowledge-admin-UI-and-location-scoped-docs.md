---
id: TASK-7.5
title: 'Deferred: knowledge admin UI and location-scoped docs'
status: To Do
assignee: []
created_date: '2026-10-28T06:23:00Z'
labels:
  - web
  - graphql
  - rag
  - deferred
dependencies:
  - TASK-7.4
parent_task_id: TASK-7
priority: low
type: enhancement
ordinal: 26000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

MVP intentionally seeds global knowledge via CLI. Operators may later need to edit documents in-product and attach venue-specific operating context or historical insight outcomes. That work is deferred until global RAG proves useful.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Out of MVP scope unless product prioritizes it after TASK-7.4
- [ ] #2 If resumed: authenticated UI or API can create/update location- or workspace-scoped knowledge without breaking global search
- [ ] #3 If resumed: historical insights storage has an explicit authorship and retention model before embedding tenant findings
<!-- AC:END -->
