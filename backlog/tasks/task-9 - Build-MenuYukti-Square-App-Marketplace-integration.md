---
id: TASK-9
title: Make MenuYukti Square application-ready with POS API analytics
status: To Do
assignee: []
created_date: '2026-10-28T13:27:00Z'
updated_date: '2026-10-28T13:53:00Z'
labels:
  - square
  - marketplace
  - analytics
  - oauth
  - pos-api
dependencies: []
references:
  - https://squareup.com/us/en/partnerships/app-partner
  - https://developer.squareup.com/docs/oauth-api/movetoprod
  - https://developer.squareup.com/docs/oauth-api/square-permissions
  - https://developer.squareup.com/docs/reporting-api
priority: high
type: feature
ordinal: 29000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

**Goal:** Be ready to apply to the Square App Marketplace by integrating Square POS APIs into MenuYukti so sellers can connect Square and MenuYukti can fetch sales/ops data to power advanced AI analytics (advisor KPIs, heatmaps, menu engineering, etc.).

Today analytics are fed mainly by Excel/manual ingest into `AnalyticsRun` / `OrderFact`. There is no multi-seller Square OAuth connector or POS-data sync. This epic ships that connector inside the existing MenuYukti product (one app — not a separate Square edition): hosted OAuth, least-privilege read scopes against Square POS/orders data, location mapping, sync into existing analytics pipelines, and marketplace application readiness (sandbox-first, then production).

**Success looks like:** a Square reviewer (or pilot seller) can Connect Square → sync → see advanced AI analytics on live Square POS data, and the technical marketplace checklist for this integration is evidence-ready for application.

Out of scope: replacing Square POS/Terminal; building native cashier/fiscalization for Square sellers; Cursor Square plugin; full App Partner co-marketing beyond what is needed to apply/list.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 MenuYukti integrates Square POS APIs (OAuth + orders/sales reads) to fetch seller data into existing analytics pipelines
- [ ] #2 Connected Square POS data (including refunds) powers advanced AI analytics surfaces (advisor/KPI charts) without Excel upload for that connection
- [ ] #3 Sellers can connect, map Square locations to MenuYukti locations, and disconnect/revoke from the product UI (sandbox and production OAuth paths exist)
- [ ] #4 Integration is Square application-ready: marketplace technical checklist items owned by this epic are met with evidence (token security/refresh, rate-limit backoff, reviewer onboarding/usage docs)
- [ ] #5 Native MenuYukti POS / digital-menu Order Board remains a separate product track; this epic does not replace Square cashiers
<!-- AC:END -->
