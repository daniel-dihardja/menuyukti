---
id: TASK-5.5
title: Align guest order status copy with Order Board stages
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T16:08:00Z'
updated_date: '2026-10-26T16:19:00Z'
labels:
  - web
  - digital-menu
  - orders
dependencies: []
references:
  - apps/web/app/(public)/[slug]/menu/public-menu-catalog.tsx
  - apps/web/messages/en/
  - apps/web/messages/de/
parent_task_id: TASK-5
priority: medium
type: enhancement
ordinal: 16000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Guests already poll prep status on the public menu. Staff board labels (Pending/New → Preparing → Ready → Closed) should match guest-facing copy so the same lifecycle is understandable on both sides without POS payment language.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Guest status strip/copy maps clearly to received, preparing, ready, and terminal (mode-aware) states
- [x] #2 Guest-facing copy does not imply in-app payment or POS close for MVP fulfillment-only flow
- [x] #3 en and de next-intl strings cover the updated guest status messaging
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Align guest prepStatus + sticky copy en/de with board stages; no payment language.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Updated guest prepStatus and sticky/sheet copy in en + de public messages to kitchen/fulfillment language (Order N, not till/payment).

<!-- SECTION:FINAL_SUMMARY:END -->
