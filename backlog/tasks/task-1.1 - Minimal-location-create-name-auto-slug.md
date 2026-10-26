---
id: TASK-1.1
title: Minimal location create (name + auto slug)
status: To Do
assignee: []
created_date: '2026-10-26T08:08:00Z'
updated_date: '2026-10-26T09:06:00Z'
labels:
  - web
  - locations
  - onboarding
dependencies: []
references:
  - apps/web/app/(protected)/analytics/locations/location-form.tsx
  - >-
    apps/web/app/(protected)/analytics/locations/location-form-basics-section.tsx
  - apps/web/app/api/locations/schema.ts
parent_task_id: TASK-1
priority: high
type: feature
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Create currently opens a tabbed form (Basics + Hours) with address, country, currency, and a full week schedule. For digital-menu-first, keep name, auto-suggested publicSlug, and opening hours (essential). Hide address/country/currency on create. Do not collect inventar areas on create (Areas is edit-only and is removed from edit in TASK-1.3). Marketing brief remains an edit-only tab and is not removed by this epic.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Create flow requires only location name to succeed (hours may be set but are not a hard Zod-required blocker if left all-closed)
- [ ] #2 Public slug is auto-suggested from name and remains optionally editable without blocking create
- [ ] #3 Create shows Basics + Hours; does not require street/city, country/currency, or areas; marketing brief is not collected on create
- [ ] #4 Successful create still persists a location usable for menu / digital menu setup
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Product note (2026-10-26): opening hours stay on create (essential). Do not remove Hours tab. Create still omits Areas (edit-only) and does not need to strip Marketing from edit — that is TASK-1.3 Areas-only.

<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-26T09:06:00Z

---

Aligned with epic: hours stay on create; Areas removal is edit-only (TASK-1.3). Marketing brief is not removed from edit.

---

<!-- COMMENTS:END -->
