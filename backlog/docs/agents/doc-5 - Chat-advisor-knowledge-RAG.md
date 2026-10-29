---
id: doc-5
title: Chat advisor knowledge RAG
type: guide
created_date: '2026-10-29T16:06:00Z'
updated_date: '2026-10-29T16:07:00Z'
tags:
  - chat
  - advisor
  - agents
  - knowledge
  - rag
---

# Chat advisor knowledge RAG

**Audience:** engineering  
**Scope:** Shared knowledge retrieval for Menuyukti **general** advisor chat — seed markdown → Postgres (pgvector) → GraphQL `searchKnowledge` → agents `search_knowledge` tool.  
**Kind:** implementation guide.  
**Related:**

- [doc-1 Chat advisor security overview](../security/doc-1%20-%20Chat-advisor-security-overview.md) — trust boundaries, untrusted tool output, RAG gaps
- [doc-3 Chat advisor memory management](../security/doc-3%20-%20Chat-advisor-memory-management.md) — **RAG ≠ location memory**; when to use which
- [doc-4 Chat advisor prompt construction](doc-4%20-%20Chat-advisor-prompt-construction.md) — `{knowledge_section}` in the general prompt, mode tool matrix
- Ops: [`apps/graphql/README.md`](../../../apps/graphql/README.md) (Knowledge layer / `make knowledge-ingest`)
- Epic: TASK-7 (and 7.1–7.5); policy: TASK-13.1

---

## What it is (and is not)

| Is                                                                               | Is not                                                               |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Operator-curated **domain / KPI / playbook** text for interpretation and actions | Live venue sales numbers (use `get_chart_data` / Visualization data) |
| Shared corpus (MVP seeds are **global** scope)                                   | Location advisor memory (`get_advisor_memory` — see doc-3)           |
| Read path: GraphQL search + agent tool                                           | Web BFF for search or ingest (none in MVP)                           |
| Results treated as **untrusted** context                                         | Instructions that can override security policy                       |

---

## Architecture

```text
apps/graphql/knowledge/*.md
  → make knowledge-ingest (CLI)
  → knowledge_document / knowledge_chunk / knowledge_embedding (+ embedding_vec)
  → GraphQL searchKnowledge
  → agents search_knowledge tool
  → wrap_untrusted("knowledge", …) → model
```

| Layer          | Path / symbol                                                              |
| -------------- | -------------------------------------------------------------------------- |
| Seed files     | `apps/graphql/knowledge/*.md`                                              |
| Models         | `apps/graphql/data_sources/models/knowledge.py`                            |
| Chunking       | `apps/graphql/services/knowledge_chunking.py`                              |
| Ingest         | `apps/graphql/services/knowledge_ingest.py`, `scripts/ingest_knowledge.py` |
| Embeddings     | `apps/graphql/services/knowledge_embeddings.py`                            |
| Search         | `apps/graphql/services/knowledge_search.py`                                |
| GraphQL        | `schema/queries/knowledge_search.py` → `searchKnowledge`                   |
| Agent tool     | `apps/agents/agents/core/chat/tools.py` → `search_knowledge`               |
| GraphQL op     | `apps/agents/agents/graphql_operations.py` → `SEARCH_KNOWLEDGE_QUERY`      |
| Prompt         | `KNOWLEDGE_SECTION` in `prompts/blocks.py` (general mode only)             |
| Untrusted wrap | `agents/core/chat/untrusted_context.py`                                    |

---

## Seed corpus (MVP)

Markdown with YAML front matter (`title`, `category`, `slug`, optional `chart_ids`, `status`). Categories: `domain` \| `kpi` \| `playbook`.

| File                                           | Category       | Typical `chart_ids`           |
| ---------------------------------------------- | -------------- | ----------------------------- |
| `domain-restaurant-marketing.md`               | domain         | —                             |
| `kpi-weak-items.md` / `playbook-weak-items.md` | kpi / playbook | `low_end_review`              |
| `kpi-menu-heatmap.md`                          | kpi            | `menu_item_heatmap`           |
| `kpi-pair-lift.md`                             | kpi            | `pair_lift_matrix_heatmap`    |
| `kpi-venue-slot-strength.md`                   | kpi            | `venue_slot_strength_heatmap` |

CLI ingest currently **requires `scope_type=global`**. Location-scoped docs exist in the data model and search SQL but are deferred for operator UI (TASK-7.5).

---

## Ingest / indexing

1. `cd apps/graphql && make knowledge-ingest` (`FORCE=1`, `DRY_RUN=1`, `DIR=…` supported).
2. Parse seeds → upsert document by slug → re-chunk/re-embed when `content_hash` changes (or force).
3. On Postgres: sync `embedding_vec` (1536) + HNSW index (Alembic knowledge/pgvector migration).

**Deploy checklist:** `alembic upgrade head` → `make knowledge-ingest` → restart GraphQL (+ agents if needed).

Env (graphql): `DATABASE_URL`, `AI_GATEWAY_API_KEY` / `VERCEL_OIDC_TOKEN` (preferred) or `OPENAI_API_KEY`, optional `KNOWLEDGE_EMBEDDING_MODEL` / `KNOWLEDGE_EMBEDDING_BASE_URL`. Ingest loads **repo root** `.env`.

---

## Search behavior

GraphQL: `searchKnowledge(query, categories, chartIds, locationId, limit)`.

| Concern   | Behavior                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------- |
| Auth      | Missing user → empty hits (silent deny)                                                                             |
| Limit     | Clamped **\[1, 20\]** (service + agent)                                                                             |
| Status    | **published** only                                                                                                  |
| Filters   | Optional `categories`, `chartIds` (metadata); optional `locationId` pin                                             |
| Retrieval | Postgres ANN on `embedding_vec`, then filter; fallback cosine on JSON embeddings (tests/SQLite)                     |
| Scope     | **global** for all authed users; **workspace** / **location** via membership/ownership (location pin must be owned) |

Agents pass `user_id` (injected) and optional config `location_id` as GraphQL `locationId`. Headers: `X-User-Id` + optional `X-Internal-Api-Key`.

---

## Agent wiring

| Mode              | `search_knowledge` bound? | Knowledge prompt section?  |
| ----------------- | ------------------------- | -------------------------- |
| `general`         | Yes                       | Yes (`KNOWLEDGE_SECTION`)  |
| `image_assistant` | No                        | No (whole prompt replaced) |
| `inventar`        | No                        | No                         |

### When the model should call (doc-4 + TASK-13.1)

**Call** for KPI/chart _meaning_, interpretation frameworks, playbooks; pass `chart_ids` when tied to catalog charts.

**Skip** when numbers already come from `get_chart_data` / Visualization data; pure copy/media turns; reuse a recent hit in-thread.

**Never** invent venue sales from knowledge alone. Prefer charts for quantities; knowledge for “what does this mean / what to do.”

Tool output is wrapped:

```text
BEGIN_UNTRUSTED_DATA channel=knowledge
…
END_UNTRUSTED_DATA
```

Aligned with `SECURITY_POLICY_SECTION` (doc-1).

---

## Separation from other advisor context

```text
RAG (this doc)     → shared definitions / playbooks
Charts             → this venue’s numbers
advisor memory     → this venue’s preferences (doc-3)
thread history     → conversation only
```

---

## Security notes

- **Write path:** repo seeds + CLI only (not end-user uploads in MVP).
- **Read path:** authenticated GraphQL + scope filters; isolation covered in GraphQL tests (`test_knowledge_rag.py`).
- **Injection:** treat hits as untrusted; do not obey embedded “ignore previous instructions.”
- Gaps / hardening backlog: see doc-1 and TASK-8 family.

---

## Deferred

- TASK-7.5: knowledge admin UI and location-scoped operator docs.
- Expanding seed corpus beyond the six MVP files.

---

## Tests (living spec)

- GraphQL: `apps/graphql/tests/test_knowledge_rag.py`
- Agents prompts / tools: `apps/agents/tests/core/test_chat_prompts.py`, `test_chat_tools_list.py`

When changing seeds: update markdown → `make knowledge-ingest`. When changing call policy: update `KNOWLEDGE_SECTION` + tool docstring + tests (and keep doc-4 in sync).
