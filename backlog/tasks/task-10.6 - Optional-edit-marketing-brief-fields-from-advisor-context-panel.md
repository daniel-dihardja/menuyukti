---
id: TASK-10.6
title: Mobile/Image Assistant parity and demote standalone location home
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
  - TASK-10.4
  - TASK-10.5
references:
  - apps/web/components/chat/chatkit/advisor-chatkit-preview.tsx
  - apps/web/components/chat/chat-layout.tsx
  - apps/web/app/(protected)/analytics/locations/[id]/page.tsx
  - apps/web/lib/routes.ts
parent_task_id: TASK-10
priority: medium
type: enhancement
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

After the desktop right-rail workspace exists, the single-page promise still fails if Image Assistant or mobile force operators back into old location/report routes, or if nav still presents Locations as a rival daily home. Finish the model: apply the spike’s Image Assistant and compact/mobile adaptations, and demote standalone location pages to secondary settings escape (copy/nav/entry points)—not delete required CRUD routes overnight unless the spike says so.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Image Assistant right-rail behavior matches the spike decision while keeping story preview usable
- [x] #2 Compact/mobile exposes venue scope + Insights / Venue / Sales reports via the spike’s sheet/drawer (or equivalent) pattern
- [x] #3 Primary operator nav/IA no longer treats standalone location edit as a rival home to `/advisor`
- [x] #4 Deep links or advanced escape to full location settings remain available where still needed
- [x] #5 Copy uses next-intl
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

Image Story tab, mobile Workspace button, demote Locations nav.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Image mode Story|Venue|Reports; mobile Workspace toolbar opens artifact sheet with full rail; sidebar/analytics copy demoted to Venue settings.

<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-29T09:03:00Z

---

Replaced optional brief-edit task; covers mode/mobile parity and demoting standalone location as daily home.

---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Image Assistant uses Story tab; mobile opens workspace sheet; Locations nav/copy demoted to Venue settings with routes kept.

<!-- SECTION:FINAL_SUMMARY:END -->
