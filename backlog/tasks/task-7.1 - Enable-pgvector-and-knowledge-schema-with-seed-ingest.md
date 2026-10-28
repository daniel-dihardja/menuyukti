---
id: TASK-7.1
title: Enable pgvector and knowledge schema with seed ingest
status: To Do
assignee: []
created_date: '2026-10-28T06:23:00Z'
labels:
  - graphql
  - pgvector
  - rag
dependencies: []
references:
  - apps/graphql/data_sources/models
  - apps/graphql/alembic
  - apps/graphql/scripts
  - docker-compose.yml
parent_task_id: TASK-7
priority: high
type: feature
ordinal: 22000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Neon Postgres already backs GraphQL, but there is no vector extension, knowledge tables, or ingest path. Without a durable document/chunk/embedding store, advisor cannot retrieve domain expertise outside the system prompt.

This foundation task enables pgvector on the product database, adds a minimal knowledge schema (documents, chunks, embeddings, category/scope metadata), and provides a seed/CLI ingest path for global domain, KPI definition, and recommendation playbook content. Business-rule thresholds stay in analytics code; narrative explanations are what get embedded.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Postgres has the vector extension enabled for the GraphQL DATABASE_URL (e.g. Neon)
- [ ] #2 Alembic migration creates knowledge document, chunk, and embedding tables with category, scope, status, version, and timestamps
- [ ] #3 Published global seed content for domain, KPI, and playbook categories can be ingested and embedded via script/CLI without an admin UI
- [ ] #4 Schema supports workspace/location scope columns for later use but MVP ingest only publishes global scope
- [ ] #5 Agents do not open the GraphQL database; persistence remains owned by apps/graphql
<!-- AC:END -->
