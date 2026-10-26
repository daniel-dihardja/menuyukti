---
id: TASK-1.3
title: Remove inventar Areas tab from location edit
status: To Do
assignee: []
created_date: '2026-10-26T08:09:00Z'
updated_date: '2026-10-26T09:06:00Z'
labels:
  - web
  - locations
dependencies: []
references:
  - apps/web/app/(protected)/analytics/locations/location-form.tsx
  - apps/web/app/(protected)/analytics/locations/location-form-areas-section.tsx
  - apps/web/app/(protected)/inventar/_components/use-form.tsx
  - apps/web/app/(protected)/inventar/page.tsx
parent_task_id: TASK-1
priority: high
type: feature
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Edit mode currently includes an Areas tab (inventar stock attribution) alongside Basics, Hours, and Marketing. For digital-menu-first, remove only the inventar Areas tab from location edit. Keep Marketing brief and guest-facing Basics/Hours.

Areas CRUD remains deferred to inventar (TASK-2). Backend area APIs stay; no data deletion. Inventar continues to consume existing areas when present.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Default location edit does not present inventar Areas as a tab
- [ ] #2 Marketing brief / profile tab remains on location edit
- [ ] #3 Operator can still update name, public slug, optional guest-facing fields (address, country/currency, hours), and marketing brief
- [ ] #4 Backend APIs for areas remain available; no data deletion required
- [ ] #5 Inventar stock use remains usable with zero areas (no area picker) and with existing areas still returned from GraphQL; removing the location Areas tab does not require inventar UI changes for this release
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-26T08:13:00Z

---

Checked inventar coupling (2026-10-26):

- Areas CRUD UI exists only on location edit (`LocationAreasSection` → `/api/location-areas`).
- Inventar only consumes areas: stock Use form shows an area picker when `areas.length > 0`, otherwise hides the field and sends `areaId: null`.
- Removing the Areas tab from location does not break inventar for digital-menu-first (empty/existing areas still work).
- Gap: after removal, there is no in-app UI to create/rename/reorder areas until CRUD moves into inventar — track as follow-up outside this release path.

---

created: 2026-10-26T09:06:00Z

---

Product decision (2026-10-26): remove only the Areas tab from location edit. Keep Marketing brief tab.

---

<!-- COMMENTS:END -->
