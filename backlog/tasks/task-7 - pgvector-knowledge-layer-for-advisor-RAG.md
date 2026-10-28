---
id: TASK-7
title: pgvector knowledge layer for advisor RAG
status: To Do
assignee: []
created_date: '2026-10-28T06:23:00Z'
labels:
  - agents
  - graphql
  - rag
  - pgvector
dependencies: []
references:
  - apps/graphql
  - apps/agents/agents/core/chat
  - apps/agents/agents/core/chat/prompts
  - apps/web/components/chat/chatkit
priority: high
type: feature
ordinal: 21000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Advisor chat already grounds answers in four analytics chart tools and location data, but explanations, KPI interpretation, and recommendation playbooks live only in system prompts. Operators need retrieved domain context that complements numerical analytics without inventing sales figures or adding new infrastructure beyond Neon Postgres.

Scope of this epic: add a minimal PostgreSQL + pgvector knowledge layer owned by apps/graphql; seed global domain/KPI/playbook content; expose authenticated semantic search over GraphQL; add a general-mode LangGraph tool so ChatKit advisor can combine chart results with retrieved knowledge.

Out of scope for MVP: knowledge admin UI; location/workspace-scoped documents (beyond authz-ready schema); historical insight memory; hybrid BM25 search; replacing get_chart_data; opening the GraphQL DB from apps/agents; new vector DB services.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Advisor can retrieve published global knowledge alongside existing chart and location tools without changing analytics compute
- [ ] #2 Knowledge storage and search live in apps/graphql (Postgres + pgvector); agents call GraphQL over HTTP only
- [ ] #3 Cross-tenant leakage is prevented by server-side scope and ownership filters on search
- [ ] #4 MVP ships without a knowledge admin UI; seed/CLI ingest is sufficient
- [ ] #5 Admin UI, location-scoped docs, and historical insights are explicitly deferred
<!-- AC:END -->
