---
id: TASK-7.4
title: Validate RAG relevance, isolation, and latency
status: To Do
assignee: []
created_date: '2026-10-28T06:23:00Z'
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

- [ ] #1 Golden questions for KPI explanation and weak-item/playbook advice return relevant retrieved chunks and grounded advisor answers in manual or automated checks
- [ ] #2 Negative tests confirm knowledge search does not return another workspace/location scoped content when such rows exist in fixtures
- [ ] #3 Advisor turn with one knowledge tool call stays within an agreed latency budget or documented measured baseline
- [ ] #4 Analytics chart answers still prefer get_chart_data for numbers; knowledge alone does not fabricate venue metrics
<!-- AC:END -->
