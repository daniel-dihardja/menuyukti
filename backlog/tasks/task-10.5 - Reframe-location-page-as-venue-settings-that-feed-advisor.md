---
id: TASK-10.5
title: 'Sales reports tab: manage and upload inside advisor'
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
  - TASK-10.3
references:
  - apps/web/app/(protected)/analytics/locations/[id]/reports/
  - apps/web/app/(protected)/analytics/locations/reports/
  - apps/web/components/chat/chat-sales-report-select.tsx
parent_task_id: TASK-10
priority: high
type: enhancement
ordinal: 43000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Sales-report upload and management live on location analytics routes today, while the active report for chat is a separate control. The Sales reports tab should be the in-advisor place to list/upload/manage reports for the selected venue, distinct from the top-of-rail dropdown that selects the active report for chat.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Sales reports tab lists sales reports for the venue selected in the right-rail scope control
- [x] #2 Operators can upload/manage sales reports for that venue without leaving `/advisor` as the primary page
- [x] #3 Choosing/activating a report for chat remains the job of the scope dropdown (or an explicit action that updates it)—roles stay distinct
- [x] #4 Empty, loading, and error states are clear
- [x] #5 Copy uses next-intl
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

Sales reports tab with upload/list/activate.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

AdvisorWorkspaceReportsTab: upload via UploadExcelClient, list via useAnalyticsList, Use in chat activates scope dropdown, salesReports flag gate.

<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-29T09:03:00Z

---

Replaced location-page reframe task with in-advisor Sales reports tab.

---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Sales reports tab lists/uploads/deletes for selected venue; Use in chat updates active report dropdown; roles stay distinct.

<!-- SECTION:FINAL_SUMMARY:END -->
