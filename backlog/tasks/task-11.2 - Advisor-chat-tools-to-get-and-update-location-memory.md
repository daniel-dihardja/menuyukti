---
id: TASK-11.2
title: Advisor chat tools to get and update location memory
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-29T11:18:00Z'
updated_date: '2026-10-29T11:28:00Z'
labels:
  - agents
dependencies:
  - TASK-11.1
references:
  - apps/agents/agents/core/chat/tools.py
  - apps/agents/agents/core/chat/tools_registry.py
  - apps/agents/agents/graphql_operations.py
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
parent_task_id: TASK-11
priority: high
type: feature
ordinal: 47000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

GraphQL memory is useless to operators until general-mode advisor can load and revise it. Today only `get_location_data` is bound for venue context, and it does not include advisor memory.

Add LangGraph tools that call the new GraphQL operations over HTTP, gated on `location_id` like existing location tools, with identity injected from RunnableConfig so the model cannot pick another venue.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 General mode with location_id binds get and update (or clear) advisor memory tools
- [x] #2 Tools omit when location_id is missing; location_id and user_id come from injected config only
- [x] #3 Successful update returns enough confirmation for the model without dumping secrets or raw GraphQL errors
- [x] #4 Agents tests cover registry gating and tool happy/error paths with mocked GraphQL
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add LOCATION_ADVISOR_MEMORY_QUERY + UPDATE mutation to graphql_operations
2. Add get_advisor_memory / update_advisor_memory tools
3. Gate in tools_registry general+location_id only
4. Extend test_chat_tools and test_chat_tools_list
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Added get_advisor_memory / update_advisor_memory tools, GraphQL ops, general-mode registry gating; 23 agents tool/list tests passed.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

General advisor can get/update location memory via injected location_id/user_id tools. Inventar/image modes unchanged. Soft errors sanitized; get output wrapped as untrusted.

<!-- SECTION:FINAL_SUMMARY:END -->
