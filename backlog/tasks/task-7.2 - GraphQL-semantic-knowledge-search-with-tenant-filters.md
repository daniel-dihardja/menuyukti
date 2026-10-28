---
id: TASK-7.2
title: GraphQL semantic knowledge search with tenant filters
status: To Do
assignee: []
created_date: '2026-10-28T06:23:00Z'
labels:
  - graphql
  - rag
  - security
dependencies:
  - TASK-7.1
references:
  - apps/graphql/schema/queries
  - apps/graphql/services
  - apps/graphql/access.py
  - apps/graphql/tests
parent_task_id: TASK-7
priority: high
type: feature
ordinal: 23000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Seeded embeddings are not useful until authenticated callers can run similarity search with hard metadata and tenancy filters. Search must live behind GraphQL so apps/agents keep the existing HTTP boundary and reuse location/workspace ownership checks.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Authenticated GraphQL query returns top-k similar published knowledge chunks for a text query
- [ ] #2 Results can be filtered by knowledge category and optional chart/KPI metadata when provided
- [ ] #3 Server-side authz includes only global published docs for MVP; workspace/location-scoped rows are never returned unless the caller is authorized for that scope
- [ ] #4 Unauthorized or unauthenticated callers receive empty results or a safe denial consistent with existing GraphQL query patterns
- [ ] #5 Tests cover happy-path retrieval and at least one cross-tenant / wrong-scope negative case
<!-- AC:END -->
