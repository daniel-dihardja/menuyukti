---
id: TASK-10.3
title: Build right-rail tab shell with Insights visualizations tab
status: Done
assignee:
  - '@agent'
created_date: '2026-10-29T08:51:00Z'
updated_date: '2026-10-29T09:13:00Z'
labels:
  - ux
  - frontend
  - advisor
dependencies:
  - TASK-10.1
  - TASK-10.2
references:
  - apps/web/components/chat/visualizations/chat-visualizations-pane.tsx
  - apps/web/components/chat/chat-layout.tsx
  - apps/web/app/(protected)/agent/_components/agent-chat-panel.tsx
parent_task_id: TASK-10
priority: high
type: enhancement
ordinal: 41000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Visualizations currently own the entire right pane. The single-page advisor needs a tabbed panel under the scope controls so Insights can coexist with Venue and Sales reports. First delivery: tab shell plus Insights tab hosting the existing visualization experience without regressing chart tools or preview behavior.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Right rail below scope controls has tabs including Insights/Visualizations, Venue, and Sales reports
- [x] #2 Insights tab hosts the existing advisor visualization experience for general mode
- [x] #3 Opening/using chart tools still surfaces visualizations appropriately (per spike default-tab guidance)
- [x] #4 Tab shell leaves room for Venue and Sales reports content without breaking desktop resize/collapse behavior
- [x] #5 Copy uses next-intl
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

Tabs shell with Insights hosting ChatVisualizationsPane; switch to Insights when viz added.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

AdvisorWorkspaceRail tabs: Insights/Story/Venue/Reports; Insights hosts ChatVisualizationsPane; viz add switches to Insights.

<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-29T09:03:00Z

---

Replaced “what the AI uses” inspect panel with tab shell + Insights tab.

---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Tab shell under scope controls with Insights visualizations pane; chart add focuses Insights; resize layout preserved via ChatWithPreviewLayout.

<!-- SECTION:FINAL_SUMMARY:END -->
