---
id: TASK-10.1
title: 'Spike: right-rail workspace IA and venue-switch rules'
status: Done
assignee:
  - '@agent'
created_date: '2026-10-29T08:51:00Z'
updated_date: '2026-10-29T09:08:00Z'
labels:
  - ux
  - advisor
dependencies: []
parent_task_id: TASK-10
priority: high
type: spike
ordinal: 39000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Before building the single-page advisor, lock the right-rail IA the product will ship: venue select above sales-report select, then tabs Insights/Visualizations, Venue, Sales reports. Critical open decisions: what happens when the operator changes venue mid-thread (rebind thread vs switch/create thread); how Image Assistant uses the same rail (story preview vs tabs); how compact/mobile presents the same model (sheet/drawer); which Venue fields are in-tab vs advanced escape; default tab behavior when tools open charts vs when venue context is thin.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Documented desktop right-rail layout matches: venue select, sales-report select, then Insights / Venue / Sales reports tabs
- [x] #2 Venue-switch vs thread-binding rule is decided and written so implementers cannot invent conflicting behavior
- [x] #3 Image Assistant adaptation of the right rail is decided
- [x] #4 Compact/mobile adaptation (sheet/drawer or equivalent) is decided
- [x] #5 Venue tab scope is decided: lean/advice-relevant fields vs advanced settings escape
- [x] #6 Guidance for default/active tab when visualizations open or venue edit is requested
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Record locked product decisions from the approved Advisor right-rail venue workspace plan as the spike outcome.
2. No product code in this subtask; subsequent subtasks implement against these decisions.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

## Locked decisions (TASK-10.1)

- Desktop IA: Right rail top = Venue select, then Sales report select. Below = tabs Insights | Venue | Sales reports.
- Venue switch: Do NOT rebind current thread locationId. Navigate to newest thread for venue or createAgentThread + router.replace. Sync AnalyticsProvider last-location. Use new thread stored analyticsRunId (usually null).
- Sales report roles: Top dropdown = active run for chat/viz. Sales reports tab = list/upload/manage; activating a run updates the dropdown.
- Venue tab: Embed lean LocationForm edit (basics/hours/marketing). Footer link to full location settings. Adapt sticky-save for panel (rail variant).
- Insights default: Stay on Insights when chart tools fire; expose setActiveTab for CTAs.
- Image Assistant: Keep scope dropdowns. Tabs = Story | Venue | Sales reports (no Insights).
- Mobile: Same workspace in artifact sheet/drawer; explicit Workspace toolbar control.
<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-29T09:03:00Z

---

Retargeted spike from generic “chip vs sheet” to the agreed right-rail workspace IA.

---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Recorded locked right-rail IA decisions (venue+report scope, tab set, venue-switch via navigate/create thread, Image Assistant Story tabs, mobile workspace sheet, lean LocationForm venue tab, Insights default + setActiveTab). No product code. Ready for TASK-10.2+.

<!-- SECTION:FINAL_SUMMARY:END -->
