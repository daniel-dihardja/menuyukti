---
id: TASK-10
title: 'Advisor as single page: right-rail venue workspace'
status: Done
assignee:
  - '@agent'
created_date: '2026-10-29T08:50:00Z'
updated_date: '2026-10-29T09:13:00Z'
labels:
  - ux
  - frontend
  - advisor
dependencies: []
references:
  - apps/web/app/(protected)/agent/
  - apps/web/components/chat/
  - apps/web/app/(protected)/analytics/locations/
  - apps/web/components/chat/visualizations/
priority: high
type: enhancement
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Operators should experience Menuyukti as one primary surface: `/advisor`. Venue setup and sales-report management should not feel like a separate product under Analytics. Today chat is left and visualizations own the right column, while location edit and sales-report upload live on other routes—so improving venue context means leaving the advisor.

Product goal: keep chat as the conversation column; turn the right column into a venue workspace. Top of the right rail: venue select, then sales-report select (active session scope). Below: a tabbed panel—Insights/Visualizations, Venue (lean edit forms that improve advice), Sales reports (upload/manage). Separate location pages become a secondary escape hatch for rare/advanced setup, not the daily path.

Constraints: do not dump an unscoped multi-destination admin UI into chat; Venue tab stays brief-first/lean; venue-switch vs thread-binding semantics must be explicit; Image Assistant and mobile need a coherent story for the same model.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Desktop advisor right rail shows venue select above sales-report select as session scope for chat and the panel below
- [x] #2 Right rail has a tabbed panel with Insights/Visualizations, Venue (edit), and Sales reports (manage/upload)
- [x] #3 Operators can add or update venue advice-relevant fields and manage sales reports without leaving `/advisor` as the primary page
- [x] #4 Active sales-report dropdown scopes chat; Sales reports tab is for list/upload/manage of the selected venue
- [x] #5 Venue-switch vs thread-binding behavior is defined and consistent (no silent mismatch between chat history and selected venue)
- [x] #6 Image Assistant and compact/mobile layouts have an explicit adaptation of the same single-page model
- [x] #7 Standalone location routes are demoted to secondary settings escape, not a rival daily home
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-29T09:03:00Z

---

Reshaped epic around single-advisor-page IA: right-rail venue + sales-report scope dropdowns and tabs (Insights / Venue / Sales reports), replacing the earlier “context chip + deep-link to location page” framing.

---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Shipped single-page advisor right-rail workspace: venue+report scope, Insights/Venue/Sales reports (Story in image mode), in-advisor edit/upload, venue-switch via thread navigate/create, mobile workspace sheet, Locations demoted to Venue settings. Verified with unit tests + tsc + eslint.

<!-- SECTION:FINAL_SUMMARY:END -->
