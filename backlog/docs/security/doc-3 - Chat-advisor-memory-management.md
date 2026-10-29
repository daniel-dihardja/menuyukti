---
id: doc-3
title: Chat advisor memory management
type: guide
created_date: '2026-10-29T14:00:00Z'
updated_date: '2026-10-29T14:08:00Z'
tags:
  - security
  - chat
  - advisor
  - memory
  - agents
  - graphql
---

# Chat advisor memory management

**Audience:** engineering  
**Scope:** Durable, location-scoped advisor memory used by general-mode `/advisor` chat (`get_advisor_memory` / `update_advisor_memory`).  
**Kind:** product + engineering guide for how memory is stored, loaded, written, and kept separate from owner brief, RAG, and thread checkpoints.  
**Date:** 2026-10-29  
**Related:** TASK-11 (MVP), TASK-11.4 (venue UI), TASK-13.1 (read policies), [doc-1 — Chat advisor security overview](doc-1%20-%20Chat-advisor-security-overview.md)

---

## Why it exists

Chat checkpoints are keyed by `agent_thread_id`. A new thread (or switching venues) forgets preferences, constraints, and “what worked” unless something durable lives **per location**.

Advisor memory fills that gap: a single rolling text blob owned by the venue, readable across threads, written only with durable operator-stated facts — not as a dump of every chat turn.

---

## What memory is (and is not)

| Store                                                 | Scope                             | Purpose                                                          |
| ----------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| **Advisor memory**                                    | One blob per `location_id`        | Cross-thread preferences, constraints, outcomes                  |
| **Owner brief** (`manualBriefInput` / `quickProfile`) | Location page                     | Owner-authored venue identity; never overwritten by memory tools |
| **`get_location_data`**                               | Location page snapshot            | Hours, address, cuisine, quick profile — factual settings        |
| **Thread checkpoint**                                 | `user_id:agent:{agent_thread_id}` | Short-term conversation history for one chat                     |
| **RAG** (`search_knowledge`)                          | Shared knowledge docs             | KPI definitions / playbooks — not venue-specific memory          |

Never treat memory as a substitute for `get_location_data`, chart numbers, or knowledge search. Never invent sales figures into memory.

---

## Architecture

```
Web BFF (/api/chat)
  → agents POST /chat  (configurable: location_id, user_id, chat_mode=general)
  → tools (when location_id bound):
       get_advisor_memory  → GraphQL location { advisorMemory { content, updatedAt } }
       update_advisor_memory(content) → updateLocationAdvisorMemory
  → GraphQL apps/graphql
       table location_advisor_memory (1:1 location, ON DELETE CASCADE)

Operator web (advisor Venue tab)
  → GET/DELETE /api/locations/:id/advisor-memory
  → same GraphQL location.advisorMemory / updateLocationAdvisorMemory
```

- **Persistence:** `apps/graphql` table `location_advisor_memory` (SQLAlchemy model `LocationAdvisorMemory`).
- **API:** nested field `Location.advisorMemory`; mutation `updateLocationAdvisorMemory(locationId, content)`.
- **Authz:** location ownership required (same pattern as other location mutations). Agents pass injected `user_id` / `location_id` from run config — the model cannot choose another venue id.
- **Size cap:** `ADVISOR_MEMORY_MAX_CHARS = 8000` (`apps/graphql/domain/advisor_memory.py`). Empty string clears memory.
- **Agents:** `apps/agents/agents/core/chat/tools.py`; GraphQL documents in `graphql_operations.py`. Tool results are wrapped with `wrap_untrusted("advisor_memory", …)`.

### Tool gating

In `tools_registry.py`, memory tools bind only in **general** mode when `location_id` is present (alongside `get_location_data`). They are **not** bound for `image_assistant` or `inventar`.

Prompt copy matches that gate: `build_system_prompt(include_location_tools=…)` / middleware `has_location_id` only inject Location + Advisor memory sections when those tools are bound (TASK-13).

---

## Read policy (when to load)

Prompt block: `ADVISOR_MEMORY_SECTION` in `apps/agents/agents/core/chat/prompts/blocks.py`.

**Call `get_advisor_memory` when:**

- Writing the location situation brief or venue-scoped advice (first load in the thread, or when preferences may affect the answer).
- The user asks what you remember about this location, or to recall past constraints / what worked.
- Building a weekly schedule if prior preferences (e.g. formats to avoid) may apply.

**Skip `get_advisor_memory` when:**

- The question is only about owner location-page facts (hours, address, cuisine) — use `get_location_data` only.
- A successful result is already in this thread’s recent tool messages and the user is not asking to refresh.
- Location tools are not available (no linked venue).

Situation briefs and schedule guidance also reference memory load via `SITUATION_LOCATION_LOAD` / `SCHEDULE_LOCATION_GUIDANCE` (same skip-if-already-loaded rule).

---

## Write policy (when to update)

**Call `update_advisor_memory` only for:**

- Durable user-stated preferences
- Constraints the operator wants remembered
- Clear decisions / outcomes worth keeping across threads

**Do not:**

- Dump full chat transcripts into the blob
- Invent sales figures or chart-derived “facts” into memory
- Write owner `quickProfile` / `manualBriefInput` fields via memory tools
- Claim memory changed location settings (hours, address, etc.)

**Clear:** pass an empty string when the user asks to forget or reset memory.

MVP is a **full replace** of the rolling blob (not append). Compaction / append-only history is deferred (TASK-11.5).

---

## Security notes

- Identity for tools comes from **injected** run config, not model-chosen location ids (see doc-1).
- Memory content returned to the model is **untrusted data** (`BEGIN_UNTRUSTED_DATA` / `END_UNTRUSTED_DATA`); the security policy section tells the model to ignore embedded instructions.
- Deleting a location cascades delete of its advisor memory row.
- Operators can view/clear memory from the advisor **Venue** workspace tab (TASK-11.4); clearing via chat tool still works.

---

---

## Operator UI (advisor Venue tab)

On `/advisor`, open the workspace **Venue** tab (right rail / mobile workspace sheet). Above the owner location form:

- View the current advisor memory blob for the selected venue (or an empty state).
- Clear with confirmation — calls `DELETE /api/locations/:id/advisor-memory` (empty `content` mutation).
- Copy states that this is separate from the owner venue brief / quick profile below.

## Operator / agent mental model

1. **Facts about the venue page** → `get_location_data`
2. **What we decided / prefer across chats** → `get_advisor_memory` / `update_advisor_memory`
3. **How KPIs work in general** → `search_knowledge`
4. **This venue’s sales numbers** → `get_chart_data` or `@` Visualization data

Keep those four channels distinct so advice stays grounded and memory stays small.

---

## Code map

| Area              | Path                                                                        |
| ----------------- | --------------------------------------------------------------------------- |
| Domain size limit | `apps/graphql/domain/advisor_memory.py`                                     |
| ORM               | `apps/graphql/data_sources/models/location_advisor_memory.py`               |
| Query / prefetch  | `apps/graphql/schema/queries/location_advisor_memory.py`                    |
| Mutation          | `apps/graphql/schema/mutations/update_location_advisor_memory.py`           |
| Chat tools        | `apps/agents/agents/core/chat/tools.py`                                     |
| Tool registry     | `apps/agents/agents/core/chat/tools_registry.py`                            |
| Prompt policy     | `apps/agents/agents/core/chat/prompts/blocks.py` (`ADVISOR_MEMORY_SECTION`) |
| Prompt gating     | `apps/agents/agents/core/chat/prompts/__init__.py`, `middleware.py`         |
| Web BFF           | `apps/web/app/api/locations/[id]/advisor-memory/route.ts`                   |
| Venue UI panel    | `apps/web/components/chat/advisor-workspace-memory-panel.tsx`               |

---

## Deferred / follow-ups

- **TASK-11.5** — Append-only memory log and compaction (out of MVP)
- No pgvector embeddings of memory in current scope (RAG knowledge remains separate, TASK-7)

---

## Changelog

- **2026-10-29** — Initial guide after TASK-11 MVP and TASK-13.1 read-policy organisation.
- **2026-10-29** — TASK-11.4: view/clear control on advisor Venue tab + BFF route.
