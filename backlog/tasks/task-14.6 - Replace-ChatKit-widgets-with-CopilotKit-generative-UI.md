---
id: TASK-14.6
title: Replace ChatKit widgets with CopilotKit generative UI
status: Done
assignee:
  - '@agent'
created_date: '2026-11-01T09:11:00Z'
updated_date: '2026-11-01T09:33:00Z'
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

- [x] #1 Chart/visualization tool outputs render via React generative UI (reuse existing chat visualization cards where practical)
- [x] #2 COGS list/edit flows no longer depend on ChatKit widget types for the CopilotKit path
- [x] #3 Story/image assistant preview signals work without ChatKit Card widgets on the CopilotKit path
- [x] #4 Tool progress/status is visible to operators during long-running tool calls
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. useRenderTool for get_chart_data (attach viz + open insights). 2. COGS tools open cogs tab. 3. generate_instagram_post_image preview. 4. Wildcard tool progress.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

AdvisorCopilotGenerativeUi registers useRenderTool for charts/COGS/image/wildcard; mounted from AdvisorCopilotChat. Side effects via useEffect helpers.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

ChatKit Card widgets replaced on Copilot path with useRenderTool generative UI: charts attach to the rail, COGS opens the workspace form, image generate shows preview + story tab, wildcard shows tool progress. tsc clean.

<!-- SECTION:FINAL_SUMMARY:END -->
