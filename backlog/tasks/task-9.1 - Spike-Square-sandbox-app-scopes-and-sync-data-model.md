---
id: TASK-9.1
title: Spike Square sandbox app, scopes, and sync data model
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-28T13:28:00Z'
updated_date: '2026-10-28T16:01:00Z'
labels:
  - square
  - marketplace
dependencies: []
references:
  - backlog/docs/square/doc-2 - Square-POS-analytics-integration-spike.md
documentation:
  - backlog/docs/square/doc-2 - Square-POS-analytics-integration-spike.md
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

- [x] #1 Sandbox Square application exists with documented Application ID usage for local/dev
- [x] #2 Recommended OAuth scope list is documented with justification (read-only POS analytics)
- [x] #3 Mapping from Square POS orders/refunds (and optional Reporting API) to MenuYukti analytics entities is written and reviewed
- [x] #4 Client/library decision is recorded for TASK-9.8 (default: official Python SDK in apps/graphql; web has no Square SDK unless justified)
- [x] #5 Open questions have proposed defaults: multi-location mapping, historical backfill window, incremental poll vs webhooks, sync freshness target
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Create backlog specification doc under square/
2. Record locked scopes, OrderFact mapping, SDK ownership, sync defaults
3. Link doc on TASK-9.1; check AC; mark Done
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Documented Square POS analytics spike decisions in doc-2: sandbox env usage, ORDERS_READ + MERCHANT_PROFILE_READ scopes, Order→OrderFact mapping, Python SDK in apps/graphql, 90-day backfill + poll freshness. Unblocks TASK-9.8.

<!-- SECTION:FINAL_SUMMARY:END -->
