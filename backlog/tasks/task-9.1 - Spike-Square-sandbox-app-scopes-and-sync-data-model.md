---
id: TASK-9.1
title: Spike Square sandbox app, scopes, and sync data model
status: To Do
assignee: []
created_date: '2026-10-28T13:28:00Z'
updated_date: '2026-10-28T13:57:00Z'
labels:
  - square
  - marketplace
dependencies: []
references:
  - https://developer.squareup.com/docs/oauth-api/square-permissions
  - https://developer.squareup.com/docs/reporting-api
parent_task_id: TASK-9
priority: high
type: spike
ordinal: 30000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Need a concrete plan before installing SDKs or building OAuth/sync. Clarify which Square POS APIs (Orders vs Payments vs Reporting) feed MenuYukti `OrderFact` / analytics, least-privilege OAuth scopes, sandbox Developer Console app setup, and which client library/ownership (`apps/graphql` Python SDK vs httpx) TASK-9.8 should install.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Sandbox Square application exists with documented Application ID usage for local/dev
- [ ] #2 Recommended OAuth scope list is documented with justification (read-only POS analytics)
- [ ] #3 Mapping from Square POS orders/refunds (and optional Reporting API) to MenuYukti analytics entities is written and reviewed
- [ ] #4 Client/library decision is recorded for TASK-9.8 (default: official Python SDK in apps/graphql; web has no Square SDK unless justified)
- [ ] #5 Open questions have proposed defaults: multi-location mapping, historical backfill window, incremental poll vs webhooks, sync freshness target
<!-- AC:END -->
