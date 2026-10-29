---
id: TASK-8.6
title: Restrict chat image URLs and sanitize tool errors for the model
status: Done
assignee: []
created_date: '2026-10-28T08:55:00Z'
updated_date: '2026-10-28T10:29:00Z'
labels:
  - security
  - chat
  - advisor
dependencies: []
references:
  - apps/agents/agents/core/chat/graph.py
  - apps/agents/agents/core/chat/middleware.py
documentation:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
parent_task_id: TASK-8
priority: medium
type: enhancement
ordinal: 6
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Agents accept https:// image URLs even though the BFF normally sends data:image payloads for @ media / vision inputs; arbitrary HTTPS can become provider-side fetch / tracking risk if agents are called outside the BFF. Tool exceptions are also stringified into ToolMessages, which can leak internals and feed indirect injection.

**Not about Leonardo:** this task is multimodal **input** URL allowlisting and tool-error sanitization for the general advisor. Leonardo generate HITL remains deferred (TASK-8.4).

Closes doc-1 findings F (error channel) and G (URL allowlist).

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Chat multimodal input rejects non-data image URLs (or an explicit documented allowlist of trusted hosts) at the agents boundary
- [x] #2 Tool failure messages returned to the model are sanitized (no raw stack traces / internal URLs / secrets); client-facing SSE errors stay similarly non-leaky
- [x] #3 Tests cover rejected image URL schemes and sanitized tool error shaping
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. data:image only in \_normalize_user_content. 2. Sanitize handle_tool_errors + in-tool errors. 3. Tighten structured_error_payload if needed. 4. Update multimodal + wrap_tool_errors tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

data:image only; sanitize_tool_error_for_model on middleware + advisor tools; structured_error_payload generic for unknown errors. multimodal + wrap_tool_errors tests pass.

<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-28T09:03:00Z

---

Clarified: multimodal input hardening only; no Leonardo generate work.

---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Agents multimodal input now accepts only data:image URLs. Tool failures return generic 'tool failed' text to the model (full exception logged server-side); client SSE generic message for unexpected errors. Tests updated for https rejection and sanitized ToolMessages.

<!-- SECTION:FINAL_SUMMARY:END -->
