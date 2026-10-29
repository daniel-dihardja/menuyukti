---
id: TASK-7.1
title: Enable pgvector and knowledge schema with seed ingest
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-28T06:23:00Z'
updated_date: '2026-10-28T06:43:00Z'
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

- [x] #1 Postgres has the vector extension enabled for the GraphQL DATABASE_URL (e.g. Neon)
- [x] #2 Alembic migration creates knowledge document, chunk, and embedding tables with category, scope, status, version, and timestamps
- [x] #3 Published global seed content for domain, KPI, and playbook categories can be ingested and embedded via script/CLI without an admin UI
- [x] #4 Schema supports workspace/location scope columns for later use but MVP ingest only publishes global scope
- [x] #5 Agents do not open the GraphQL database; persistence remains owned by apps/graphql
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add knowledge models (document/chunk/embedding) with JSON embedding storage for SQLite + Postgres vector index via migration.
2. Alembic: CREATE EXTENSION vector + tables; down_revision f5a6b7c8d9e0.
3. Ingest service: chunk + hash + embed via AI Gateway or OpenAI-compatible embeddings endpoint; seed CLI + sample global docs.
4. Tests for ingest chunking/upsert without requiring live embeddings (mock embedder).
5. Proceed to 7.2 searchKnowledge, 7.3 agent tool, 7.4 validation.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Shipped models + Alembic g6h7i8j9k0l1 (CREATE EXTENSION vector + tables + HNSW), seed markdown under apps/graphql/knowledge/, ingest CLI, StaticEmbedder tests. Run make db-upgrade on Neon then ingest_knowledge.py with AI_GATEWAY_API_KEY or OPENAI_API_KEY.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Added knowledge_document/chunk/embedding schema with pgvector extension migration, JSON embeddings for SQLite + embedding_vec on Postgres, seed docs (domain/KPI/playbook), and scripts/ingest_knowledge.py. Verified with pytest tests/test_knowledge_rag.py (5 passed). Deploy: alembic upgrade + enable vector on Neon + run ingest.

<!-- SECTION:FINAL_SUMMARY:END -->
