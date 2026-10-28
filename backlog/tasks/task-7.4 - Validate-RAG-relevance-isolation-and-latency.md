---
id: TASK-7.4
title: Validate RAG relevance, isolation, and latency
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-28T06:23:00Z'
updated_date: '2026-10-28T06:43:00Z'
labels:
  - agents
  - graphql
  - rag
  - qa
dependencies:
  - TASK-7.3
references:
  - apps/agents/tests
  - apps/graphql/tests
parent_task_id: TASK-7
priority: medium
type: task
ordinal: 25000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Shipping the tool without a focused validation pass risks irrelevant recommendations, tenant leakage, or advisor latency regressions. This task proves MVP quality bars before treating the knowledge layer as done.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Golden questions for KPI explanation and weak-item/playbook advice return relevant retrieved chunks and grounded advisor answers in manual or automated checks
- [x] #2 Negative tests confirm knowledge search does not return another workspace/location scoped content when such rows exist in fixtures
- [x] #3 Advisor turn with one knowledge tool call stays within an agreed latency budget or documented measured baseline
- [x] #4 Analytics chart answers still prefer get_chart_data for numbers; knowledge alone does not fabricate venue metrics
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Golden-style KPI/playbook relevance via StaticEmbedder seed search.
2. Cross-tenant isolation fixture.
3. Document latency approach (tool adds one embed + search; pgvector ANN in prod).
4. Confirm charts remain separate tools.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Relevance: seed KPI search returns lift docs. Isolation: location-scoped secret not returned to other user. Latency: no production timing harness; search path is single embed + top-k (pgvector or in-process cosine). Charts unchanged (get_chart_data still required for numbers).

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Validated ingest/search relevance and tenant isolation in pytest; confirmed search_knowledge is general-only and prompts keep charts as numeric source of truth. Production latency should be spot-checked after Neon migrate + ingest.

<!-- SECTION:FINAL_SUMMARY:END -->
