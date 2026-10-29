---
id: TASK-11.3
title: Prompt policy for loading and writing advisor memory
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-29T11:18:00Z'
updated_date: '2026-10-29T11:28:00Z'
labels:
  - agents
  - prompts
dependencies:
  - TASK-11.2
references:
  - apps/agents/agents/core/chat/prompts/general.py
  - apps/agents/agents/core/location_page_format.py
parent_task_id: TASK-11
priority: high
type: enhancement
ordinal: 48000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Without prompt rules, the model will either never write memory or dump every turn into it. Operators need memory used as durable decision context — preferences, what worked, constraints — while owner brief stays the source of venue identity facts.

Update general-mode guidance so the advisor loads memory with location context when advising, writes only durable user-stated preferences or clear decisions, and never confuses memory with `quickProfile` / owner notes.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 General prompt instructs when to call get vs update memory vs get_location_data
- [x] #2 Prompt forbids treating advisor memory as owner brief and forbids inventing sales facts into memory
- [x] #3 Prompt limits writes to durable preferences, constraints, and outcomes — not full chat transcripts
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Extend general.py Location / Advisor memory sections
2. Update prompt tests if present
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Extended general.py with Advisor memory section and load-on-situation guidance; prompt tests assert get/update tools and quickProfile separation.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

General prompt teaches when to get/update advisor memory vs get_location_data, forbids inventing sales into memory or confusing with owner brief, and limits writes to durable notes.

<!-- SECTION:FINAL_SUMMARY:END -->
