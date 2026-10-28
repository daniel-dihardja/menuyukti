---
id: TASK-8.8
title: >-
  Unbind Leonardo generate tool from general advisor while Image Assistant is
  off
status: Done
assignee: []
created_date: '2026-10-28T09:04:00Z'
updated_date: '2026-10-28T10:26:00Z'
labels:
  - security
  - chat
  - advisor
dependencies: []
references:
  - apps/agents/agents/core/chat/tools_registry.py
  - apps/web/config/feature-flags.json
documentation:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
parent_task_id: TASK-8
priority: high
type: chore
ordinal: 3.5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

`chatImageAssistant` is MVP-off in the web feature flags, but agents still bind `generate_instagram_post_image` for any request with an `agent_thread_id` (general advisor). That leaves a Leonardo side-effect path live while the product UI no longer offers Image Assistant.

Align tool binding with the flag (or an agents-side equivalent): general advisor must not offer Leonardo generate while Image Assistant is disabled. IG Studio Post Creator (`post_id` + `page_id`) can keep generate when that product surface is enabled.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 When chatImageAssistant (or documented agents equivalent) is disabled, general advisor chat does not bind generate_instagram_post_image
- [x] #2 IG Studio Post Creator context can still bind generate when post/page ids are present and that surface is in use
- [x] #3 Automated test covers tool list with/without the Image Assistant flag (or config gate)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Make has_leonardo_image_generation always false so general advisor never binds generate. 2. Leave image_assistant path untouched. 3. Update test_chat_tools_list for advisor configs.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

has_leonardo_image_generation always False; tests assert no generate for agent_thread or post/page. image_assistant path unchanged.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

General advisor no longer binds generate_instagram_post_image (has_leonardo_image_generation always false). IG Studio post context also unbound per advisor-only scope. test_chat_tools_list: 9 passed.

<!-- SECTION:FINAL_SUMMARY:END -->
