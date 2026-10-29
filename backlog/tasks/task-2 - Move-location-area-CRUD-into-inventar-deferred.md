---
id: TASK-2
title: Move location area CRUD into inventar (deferred)
status: To Do
assignee: []
created_date: '2026-10-26T08:13:00Z'
updated_date: '2026-10-26T09:06:00Z'
labels:
  - web
  - inventar
  - locations
dependencies:
  - TASK-1.3
references:
  - apps/web/app/(protected)/analytics/locations/location-form-areas-section.tsx
  - apps/web/app/(protected)/inventar/_components/use-form.tsx
priority: low
type: chore
ordinal: 27000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Location areas exist only for inventar stock-use attribution. Today the only manage UI is the Areas tab on location edit. Digital-menu-first (TASK-1) removes that tab from the default location path, which orphans create/rename/reorder for operators who later use inventar.

When inventar is an intentional product surface again, area management should live next to stock use (e.g. inventar settings per location), not on the guest-facing location form. Not required for digital-menu onboarding.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Operators can create, rename, reorder, and delete location areas from an inventar-scoped UI without opening location edit Areas tab
- [ ] #2 Inventar Use form continues to list areas for the selected location
- [ ] #3 Location create/edit default path does not regain inventar Areas as a primary tab
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-26T09:06:00Z

---

Unchanged by 2026-10-26 decision: TASK-1.3 still only removes Areas from location; Marketing stays. TASK-2 remains the follow-up for area CRUD in inventar.

---

<!-- COMMENTS:END -->
