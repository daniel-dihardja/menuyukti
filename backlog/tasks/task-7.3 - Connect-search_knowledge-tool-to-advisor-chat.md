---
id: TASK-7.3
title: Connect search_knowledge tool to advisor chat
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-28T06:23:00Z'
updated_date: '2026-10-28T06:43:00Z'
labels:
  - agents
  - chatkit
  - rag
dependencies:
  - TASK-7.2
references:
  - apps/agents/agents/core/chat/tools.py
  - apps/agents/agents/core/chat/tools_registry.py
  - apps/agents/agents/core/chat/prompts
  - apps/agents/agents/graphql_operations.py
  - apps/agents/agents/core/chatkit/bridge.py
parent_task_id: TASK-7
priority: high
type: feature
ordinal: 24000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Chart tools already supply numerical analytics, but the ReAct advisor has no way to fetch playbooks or KPI explanations from the new knowledge API. Without a general-mode tool and prompt guidance, retrieved knowledge will not reach ChatKit answers.

Add a search_knowledge tool that calls GraphQL, gate it like other general-mode tools, and update system prompt blocks so the model uses knowledge for interpretation/recommendations while keeping get_chart_data as the source of truth for metrics.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 general chat mode exposes a search_knowledge tool that calls the GraphQL knowledge search over HTTP
- [x] #2 image_assistant and inventar modes do not bind search_knowledge for MVP
- [x] #3 System prompt instructs when to use knowledge vs chart/location tools and forbids inventing sales numbers from knowledge alone
- [x] #4 Existing get_chart_data and get_location_data behavior remains unchanged
- [x] #5 ChatKit tool status labeling covers the new tool without breaking existing tool widgets
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add SEARCH_KNOWLEDGE_QUERY + search_knowledge tool.
2. Gate to general mode in tools_registry.
3. Prompt KNOWLEDGE_SECTION + ChatKit status labels.
4. Tests for tool list / prompts.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Tool calls GraphQL over HTTP; inventar/image_assistant omit it; prompts forbid inventing sales numbers from knowledge alone.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Added search_knowledge ReAct tool (general mode), GraphQL op, system-prompt knowledge section, and ChatKit compact status. Verified with agents tests/core/test_chat_tools_list.py and test_chat_prompts.py.

<!-- SECTION:FINAL_SUMMARY:END -->
