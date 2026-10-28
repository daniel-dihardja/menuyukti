---
id: TASK-7.3
title: Connect search_knowledge tool to advisor chat
status: To Do
assignee: []
created_date: '2026-10-28T06:23:00Z'
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

- [ ] #1 general chat mode exposes a search_knowledge tool that calls the GraphQL knowledge search over HTTP
- [ ] #2 image_assistant and inventar modes do not bind search_knowledge for MVP
- [ ] #3 System prompt instructs when to use knowledge vs chart/location tools and forbids inventing sales numbers from knowledge alone
- [ ] #4 Existing get_chart_data and get_location_data behavior remains unchanged
- [ ] #5 ChatKit tool status labeling covers the new tool without breaking existing tool widgets
<!-- AC:END -->
