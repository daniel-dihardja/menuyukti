---
id: TASK-15
title: Remove mobile-app, device auth, and CRM stack
status: Done
assignee: []
created_date: '2026-11-16T07:46:00Z'
updated_date: '2026-11-16T07:52:00Z'
labels: []
dependencies: []
references:
  - apps/mobile-app
  - apps/web/app/api/mobile
  - apps/web/app/(protected)/crm
  - apps/graphql/crm_auth
priority: high
type: chore
ordinal: 64000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The Expo CRM client is deprecated and inactive. Device auth (web mobile BFF + GraphQL /crm/v1) and the operator /crm admin UI only serve that stack; the customer PWA does not use CRM. Remove the full stack including GraphQL CRM/cashback and drop CRM tables via a new Alembic migration.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 apps/mobile-app is deleted and lockfile/workspace no longer reference it
- [x] #2 Web /api/mobile device-auth BFF, /crm admin UI, and /api/crm are removed
- [x] #3 GraphQL crm_auth HTTP, CRM schema/models/services, and cashback service key are removed
- [x] #4 New Alembic migration drops all CRM tables; historical CRM migrations untouched
- [x] #5 Docs/skills/rules no longer describe mobile-app or CRM device auth as product surfaces
- [x] #6 Web and GraphQL tests/typecheck pass without CRM/mobile leftovers
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Delete apps/mobile-app and monorepo wiring (lint-staged, gitignore, turbo/env, pnpm lockfile).
2. Delete web device-auth BFF, CRM admin UI/API, flags, nav, i18n, cashback catalog.
3. Delete GraphQL crm_auth, CRM schema/services/models, server bypass, CRM tests.
4. Add Alembic drop migration for all CRM tables (head: h2i3j4k5l6m7).
5. Scrub docs/skills/rules; delete menuyukti-mobile skill.
6. Verify with tests and greps.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Verified: web vitest 595 passed; graphql pytest 412 passed / 6 skipped; web typecheck clean; alembic head i3j4k5l6m7n8; schema export + codegen without CRM types.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Removed the deprecated Expo mobile app, web device-auth BFF (`/api/mobile`), CRM admin UI/API (`/crm`, `/api/crm`), and the GraphQL CRM stack (`crm_auth` HTTP, schema, models, cashback service key). Added Alembic revision `i3j4k5l6m7n8` to drop CRM tables; historical CRM migrations kept. Docs/skills updated; `menuyukti-mobile` skill deleted. Verification: web tests + typecheck green, GraphQL suite green, lockfile no longer references mobile-app.

<!-- SECTION:FINAL_SUMMARY:END -->
