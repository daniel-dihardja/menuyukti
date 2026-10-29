---
id: TASK-12
title: Collapse attached advisor visualizations
status: Done
assignee: []
created_date: '2026-10-29T12:00:00Z'
updated_date: '2026-10-29T12:01:00Z'
labels: []
dependencies: []
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Attached Insights charts on /advisor are always fully expanded, so multiple heatmaps crowd the rail and make scanning the list hard. Operators need to tuck charts away while keeping them attached and @-mentionable.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Each attached chart card can be expanded and collapsed from its header
- [x] #2 Collapse state persists per agent thread across reloads
- [x] #3 Newly added charts start expanded; removing a chart clears its collapse state
- [x] #4 Expand and collapse controls have accessible labels; remove remains available when collapsed
- [x] #5 Unit tests cover collapsed-id parse and remove helpers
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add collapsedIds helpers in chat-visualization-catalog and persist via useChatVisualizations (localStorage key chat-visualization-collapsed:v1:{threadId}); expose setVisualizationExpanded on context; clear collapsed entry on remove.
2. Wrap Insights chart Cards in controlled Collapsible with chevron trigger and stopPropagation on remove.
3. Add expand/collapse aria i18n in en + id chat.visualizations.
4. Unit-test parse and remove helpers for collapsed ids.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Implemented Collapsible cards in ChatVisualizationsPane; collapsedIds persisted under chat-visualization-collapsed:v1:{threadId}. Vitest: 12 passed in chat-visualization-catalog.test.ts.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Attached Insights charts on /advisor can now collapse per card. Collapse state is stored per agent thread in localStorage; new charts start expanded; remove clears collapse state. Expand/collapse use accessible aria labels; remove stays on the header when collapsed. Catalog helper unit tests cover parse/set/remove for collapsed ids (12 tests passed).

<!-- SECTION:FINAL_SUMMARY:END -->
