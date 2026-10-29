---
id: TASK-13.1
title: Define when advisor loads RAG vs location memory
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-29T13:52:00Z'
updated_date: '2026-10-29T13:58:00Z'
labels:
  - agents
  - advisor
  - prompts
  - rag
  - memory
dependencies: []
references:
  - apps/agents/agents/core/chat/prompts/general.py
  - apps/agents/agents/core/chat/prompts/blocks.py
  - apps/agents/agents/core/chat/tools.py
  - apps/agents/agents/core/chat/tools_registry.py
  - apps/graphql/knowledge/
  - TASK-11.3
  - TASK-7.3
parent_task_id: TASK-13
priority: medium
type: chore
ordinal: 53000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Today `KNOWLEDGE_SECTION` and the Advisor memory section tell the model to call `search_knowledge` and `get_advisor_memory`, but the triggers are broad (situation briefs, vague openers, “when advising”). That overlaps with chart/`get_location_data` guidance and can cause redundant tool rounds or skipped retrieval when KPI/playbook context would help.

This chore tightens _read_ policies only: when to call `search_knowledge` (including categories / chart_ids) versus when to call `get_advisor_memory`, how those relate to `@` Visualization data and `get_chart_data`, and how to keep RAG/memory as untrusted data. Builds on TASK-11.3 write policy and TASK-7 RAG wiring — does not change GraphQL schema or inventar/image_assistant modes unless needed for consistency.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 General prompt (or focused prompt blocks) states concrete triggers for calling `search_knowledge` vs skipping it (e.g. KPI meaning / playbooks vs venue numbers already in charts)
- [x] #2 General prompt states concrete triggers for calling `get_advisor_memory` vs relying on thread history or `get_location_data` only
- [x] #3 Read policies remain consistent with untrusted-data security rules and do not instruct inventing sales figures from RAG or memory
- [x] #4 Prompt/tool tests updated (or smoke checklist noted) so RAG and memory load guidance stay aligned with bound tools
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Read current general prompt, KNOWLEDGE_SECTION, Advisor memory section, tool docstrings, and prompt tests.
2. Tighten RAG read policy in blocks.py (when to call search_knowledge vs skip; categories/chart_ids; charts remain numbers).
3. Tighten memory read policy in general.py (when to get_advisor_memory vs thread/`get_location_data`); keep write rules from TASK-11.3.
4. Gate memory prompt copy on location_id (and knowledge always-on for general) so prompts match tools_registry; update build_system_prompt + middleware config.
5. Align search_knowledge / get_advisor_memory tool docstrings with the same read triggers.
6. Update/add prompt and registry tests; run agents pytest for chat prompts/tools.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Tightened KNOWLEDGE_SECTION and ADVISOR_MEMORY_SECTION with Call/Skip triggers; moved Location + memory + situation/schedule load copy into gated blocks. build_system_prompt(include_location_tools) + middleware has_location_id. Tool docstrings for search_knowledge and get_advisor_memory aligned. Tests: test_chat_prompts + test_chat_prompt_wiring + test_chat_tools (31 passed).

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

General advisor now has explicit RAG vs location-memory read policies (when to call/skip, chart_ids, untrusted data, no invented sales). Location/memory prompt sections only appear when location_id binds those tools. Verified with agents pytest on prompt/wiring/tools.

<!-- SECTION:FINAL_SUMMARY:END -->
