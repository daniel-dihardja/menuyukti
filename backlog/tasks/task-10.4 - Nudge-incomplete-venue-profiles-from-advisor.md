---
id: TASK-10.4
title: 'Venue tab: lean location edit inside advisor'
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
  - apps/web/app/(protected)/analytics/locations/location-form.tsx
  - apps/web/app/(protected)/analytics/locations/location-form-brief-section.tsx
  - apps/web/lib/location-quick-profile.ts
parent_task_id: TASK-10
priority: high
type: enhancement
ordinal: 42000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Venue facts that improve advisor quality still require leaving chat for `/analytics/locations/[id]`. On the single-page advisor, the Venue tab is where operators add or update advice-relevant location data (marketing brief / quick profile first; other lean fields per spike) without treating the tab as a dump of the full multi-tab admin form.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Venue tab on the advisor right rail lets operators view and edit lean, advice-relevant venue fields for the selected location
- [x] #2 Saves persist through existing location APIs/GraphQL paths and refresh the session venue context used by chat
- [x] #3 Full/advanced location setup stays out of the primary tab body or is clearly secondary per spike (no unscoped full-form dump)
- [x] #4 Validation, loading, and error feedback are clear
- [x] #5 Optional thin-context CTA can switch to the Venue tab without blocking chat
- [x] #6 Copy uses next-intl
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

GET /api/locations/[id]; Venue tab LocationForm rail variant.

<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

GET location BFF; AdvisorWorkspaceVenueTab with LocationForm variant=rail; advanced settings link; setWorkspaceTab available for CTAs.

<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-29T09:03:00Z

---

Replaced incomplete-profile nudge task; in-advisor Venue edit is now core to the single-page model.

---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Venue tab embeds lean LocationForm (rail sticky save); GET /api/locations/[id]; advanced escape to venue settings; i18n.

<!-- SECTION:FINAL_SUMMARY:END -->
