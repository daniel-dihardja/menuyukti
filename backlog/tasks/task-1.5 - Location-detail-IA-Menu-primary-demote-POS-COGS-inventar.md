---
id: TASK-1.5
title: 'Location detail IA: Menu primary; demote POS, COGS, inventar'
status: To Do
assignee: []
created_date: '2026-10-26T08:09:00Z'
labels:
  - web
  - locations
  - digital-menu
  - onboarding
dependencies: []
references:
  - apps/web/app/(protected)/analytics/locations/[id]/page.tsx
parent_task_id: TASK-1
priority: high
type: feature
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Location detail header currently lists manage Reports, COGS, Menu, and POS as peer outline buttons. For this release POS, COGS, and inventar are not necessary to try digital menu; peer placement implies they are part of the core setup. Reorient chrome so Menu / digital menu are primary and ops surfaces are secondary or hidden on this path.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Location detail primary actions emphasize Menu and/or digital menu
- [ ] #2 POS, COGS, and inventar are not presented as equal peer primary actions on the default location detail path for this release
- [ ] #3 Reports/analytics entry is not required to complete digital-menu onboarding from location detail
<!-- AC:END -->
