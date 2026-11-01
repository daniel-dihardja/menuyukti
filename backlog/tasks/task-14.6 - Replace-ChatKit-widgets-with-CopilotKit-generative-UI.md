---
id: TASK-14.6
title: Replace ChatKit widgets with CopilotKit generative UI
status: To Do
assignee: []
created_date: '2026-11-01T09:11:00Z'
labels:
  - frontend
  - agents
  - chat
dependencies:
  - TASK-14.4
references:
  - apps/agents/agents/core/chatkit/widgets.py
  - apps/agents/agents/core/chatkit/bridge.py
  - apps/web/components/chat/visualizations/
  - https://docs.copilotkit.ai/generative-ui
parent_task_id: TASK-14
priority: high
type: feature
ordinal: 60000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Agents currently emit ChatKit Cards/widgets (tool status, charts, COGS forms, story confirm, generated images) via the bridge. Maintaining a second UI DSL blocks reuse of existing React visualization and form components. Map tool calls and/or agent state to CopilotKit generative UI using the existing React components where possible.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Chart/visualization tool outputs render via React generative UI (reuse existing chat visualization cards where practical)
- [ ] #2 COGS list/edit flows no longer depend on ChatKit widget types for the CopilotKit path
- [ ] #3 Story/image assistant preview signals work without ChatKit Card widgets on the CopilotKit path
- [ ] #4 Tool progress/status is visible to operators during long-running tool calls
<!-- AC:END -->
