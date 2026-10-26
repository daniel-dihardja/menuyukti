---
id: TASK-1.7
title: Edit guest IA and marketing lead
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-26T09:21:00Z'
updated_date: '2026-10-26T09:26:00Z'
labels:
  - web
  - locations
dependencies: []
references:
  - >-
    apps/web/app/(protected)/analytics/locations/location-form-basics-section.tsx
  - apps/web/app/(protected)/analytics/locations/location-form-brief-section.tsx
  - apps/web/messages/en/analytics.json
parent_task_id: TASK-1
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Edit tabs use abstract Basics/Marketing labels and dump address next to guest URL. Marketing leads with AI notes instead of guest contact fields operators expect first.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Edit tabs are labeled Guest info, Hours, and Profile
- [x] #2 Street, city, country, and currency sit under a Location details collapsible (open when any filled)
- [x] #3 Marketing/Profile leads with phone, Instagram, website, then neighborhood and email; notes after
- [x] #4 Copy softens AI-first notes framing and keeps profile progress with a next-suggested line when incomplete
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Rename tabs Guest info / Hours / Profile. 2. Location details collapsible for address fields. 3. Reorder marketing contact-first; soften notes copy; next-suggested progress line.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Tabs renamed Guest info/Hours/Profile; address fields in Location details collapsible; marketing order phone→IG→website→neighborhood→email then notes; nextSuggestedBriefField coach line.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Edit IA now uses Guest info / Hours / Profile tabs, collapses address under Location details, and leads Profile with guest contact fields plus a next-suggested coach line. Verified with typecheck and unit test for nextSuggestedBriefField.

<!-- SECTION:FINAL_SUMMARY:END -->
