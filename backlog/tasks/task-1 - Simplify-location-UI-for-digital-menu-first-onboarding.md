---
id: TASK-1
title: Simplify location UI for digital-menu-first onboarding
status: Done
assignee: []
created_date: '2026-10-26T08:08:00Z'
updated_date: '2026-10-26T09:26:00Z'
labels:
  - web
  - locations
  - digital-menu
  - onboarding
dependencies: []
references:
  - apps/web/app/(protected)/analytics/locations/location-form.tsx
  - apps/web/app/(protected)/analytics/locations/[id]/page.tsx
  - apps/web/app/(protected)/analytics/locations/create/
priority: high
type: feature
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Trial operators struggle to try Menuyukti because location setup is framed as a POS/analytics branch hub (sales upload, COGS, inventar areas). For the current release the digital menu must work without POS, COGS, or inventar — location should be a lightweight container for a public menu.

Scope of this epic: location create, location edit/update, and location detail chrome/CTAs that pull operators into POS/COGS/inventar/analytics. On edit, remove only the inventar Areas tab; keep Marketing brief. Menu builder and digital-menu console changes may be follow-on work; keep them out of this epic unless they block a publishable guest URL.

Out of scope: implementing POS/COGS/inventar features; removing backend APIs; full inventar product redesign; removing the Marketing brief tab.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 A new operator can create a location with name (and optional auto slug) without filling address, areas, COGS, or POS fields; opening hours remain available on create as essential guest-facing settings
- [x] #2 After create, primary guidance points to menu / digital menu — not upload sales, POS, COGS, or inventar
- [x] #3 Location edit removes the inventar Areas tab; Marketing brief remains; guest-facing settings (name, slug, optional address/country/currency/hours) remain available
- [x] #4 Location detail does not present POS, COGS, or inventar as peer primary actions alongside Menu / digital menu for this release path
- [x] #5 Existing locations with areas, brief, COGS, or POS data remain readable via existing APIs; simplification is UI/onboarding, not data deletion
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

All subtasks 1.1–1.7 Done. Create is single-screen name+slug+optional hours; post-create → menu; edit keeps Profile without Areas; detail Menu-primary; no API deletions.

<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-26T08:13:00Z

---

Areas note: inventar consumes location areas but does not manage them. TASK-1.3 removes Areas from location default edit; inventar needs no change for digital-menu-first. Follow-up TASK-2 covers moving area CRUD into inventar when inventar is in scope again.

---

created: 2026-10-26T09:06:00Z

---

Product decision (2026-10-26): remove only Areas from location edit (keep Marketing). Opening hours stay on create/edit as essential.

---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Digital-menu-first location onboarding is complete across create (single screen), post-create menu redirect, hours presets-first, edit guest IA, and detail CTAs. Areas/POS/COGS demoted without deleting backend data. Verified with apps/web typecheck and helper unit tests.

<!-- SECTION:FINAL_SUMMARY:END -->
