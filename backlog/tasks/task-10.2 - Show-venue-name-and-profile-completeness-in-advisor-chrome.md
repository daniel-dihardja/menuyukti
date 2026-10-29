---
id: TASK-10.2
title: Add venue and sales-report scope controls to advisor right rail
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
references:
  - apps/web/components/chat/chatkit/advisor-chatkit-toolbar.tsx
  - apps/web/components/chat/chat-sales-report-select.tsx
  - apps/web/app/(protected)/agent/[threadId]/agent-thread-workspace.tsx
  - apps/web/lib/chat/agent-thread-registry.ts
parent_task_id: TASK-10
priority: high
type: enhancement
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Session scope for advisor (which venue, which sales report) is split today: venue is chosen when creating a thread / on the list, sales report sits in the chat toolbar, and the right column has no venue identity. For a single-page advisor, both selectors belong at the top of the right rail so chat and every tab share one obvious context.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Desktop right rail shows a venue select above a sales-report select
- [x] #2 Selected venue and sales report drive chat requests and the right-rail tabs for that session
- [x] #3 Venue change follows the spike’s thread-binding rule without silent history/context mismatch
- [x] #4 Duplicate/conflicting sales-report controls in the chat toolbar are removed or clearly demoted so one primary selector remains
- [x] #5 Empty and loading states for venue/report lists are clear
- [x] #6 Copy uses next-intl
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add resolveOrCreateAgentThreadForLocation helper + unit test.
2. Extend shell with workspace tab state and branches prop plumbing.
3. Build AdvisorWorkspaceRail scope controls; wire venue switch + report select.
4. Remove sales-report from chat toolbar; drop redundant sales report strip.
5. Pass branches from thread page via cached locations list.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Implemented AdvisorWorkspaceRail scope controls, venue→thread navigation helper, removed toolbar sales-report select and sales-report strip, thread page loads branches.

<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-29T09:03:00Z

---

Replaced completeness-chip task with right-rail session scope controls.

---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Right rail shows venue + sales-report selects; venue switch navigates/creates thread without rebinding; toolbar duplicate removed; next-intl copy added.

<!-- SECTION:FINAL_SUMMARY:END -->
