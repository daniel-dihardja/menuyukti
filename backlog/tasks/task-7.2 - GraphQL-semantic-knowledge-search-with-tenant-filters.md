---
id: TASK-7.2
title: GraphQL semantic knowledge search with tenant filters
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-28T06:23:00Z'
updated_date: '2026-10-28T06:43:00Z'
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

- [x] #1 Authenticated GraphQL query returns top-k similar published knowledge chunks for a text query
- [x] #2 Results can be filtered by knowledge category and optional chart/KPI metadata when provided
- [x] #3 Server-side authz includes only global published docs for MVP; workspace/location-scoped rows are never returned unless the caller is authorized for that scope
- [x] #4 Unauthorized or unauthenticated callers receive empty results or a safe denial consistent with existing GraphQL query patterns
- [x] #5 Tests cover happy-path retrieval and at least one cross-tenant / wrong-scope negative case
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Expose searchKnowledge GraphQL query with category/chart/location filters.
2. Authz via global + workspace/location ownership helpers.
3. Postgres ANN via embedding_vec when present; Python cosine fallback (SQLite tests).
4. Isolation tests for location-scoped docs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

searchKnowledge query + knowledge_search service with scope filters; pgvector ANN when embedding_vec present else Python cosine. Isolation covered in test_location_scoped_doc_not_leaked_across_tenants.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Exposed authenticated searchKnowledge GraphQL field with category/chartIds/locationId/limit filters and server-side scope authz (global + owned workspace/location). Verified retrieval + cross-tenant negative case in tests/test_knowledge_rag.py.

<!-- SECTION:FINAL_SUMMARY:END -->
