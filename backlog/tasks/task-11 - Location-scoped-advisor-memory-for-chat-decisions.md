---
id: TASK-11
title: Location-scoped advisor memory for chat decisions
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-29T11:17:00Z'
updated_date: '2026-10-29T11:28:00Z'
labels:
  - agents
  - graphql
  - advisor
  - memory
dependencies: []
references:
  - apps/graphql
  - apps/agents/agents/core/chat
  - apps/agents/agents/core/location_page_format.py
  - apps/graphql/schema/mutations/update_location_manual_brief_input.py
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
  - TASK-7.5
priority: high
type: feature
ordinal: 45000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Advisor chat can load location-page data (`get_location_data`) and owner `manualBriefInput.quickProfile`, but anything the model learns across turns is trapped in a single `agent_thread_id` checkpoint. A new venue or a new advisor thread forgets preferences, what worked, and open constraints — so advice re-asks or re-guesses.

Owner `quickProfile.notes` is the wrong write target: it is owner-authored structured brief data, validated enums, and a full-document replace mutation. Mixing LLM accumulation there risks wiping owner fields and confusing the location form.

Scope of this epic: add location-owned advisor memory in `apps/graphql` (separate from `location_manual_brief_input`); expose authenticated get/update; wire general-mode chat tools that inject `location_id`/`user_id` from run config; teach prompts when to load vs write. MVP is a single rolling memory blob per location with size limits.

Out of scope for MVP: updating address/hours/public slug via chat; writing into `quickProfile`; pgvector embeddings of memory; append-only event log / auto-compaction; replacing RAG knowledge docs (TASK-7); inventar-mode writes unless product expands later.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Advisor can read and update durable per-location memory across chat threads for the same venue
- [x] #2 Memory is stored and authorized in apps/graphql; agents call GraphQL over HTTP only
- [x] #3 Owner manual brief (`quickProfile`) remains separate and is never overwritten by advisor memory tools
- [x] #4 Tool identity uses injected location_id/user_id; model cannot choose another venue id
- [x] #5 MVP ships a size-capped rolling memory; append-only history and compaction are explicitly deferred
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

MVP complete via TASK-11.1–11.3. TASK-11.4 UI and TASK-11.5 compaction remain deferred.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Location-scoped advisor memory MVP shipped: GraphQL text store + get/update chat tools (injected venue identity) + general prompt policy. Owner quickProfile untouched. Optional venue UI (11.4) and append/compaction (11.5) left deferred. Apply Alembic h2i3j4k5l6m7 and restart graphql/agents to smoke-test in chat.

<!-- SECTION:FINAL_SUMMARY:END -->
