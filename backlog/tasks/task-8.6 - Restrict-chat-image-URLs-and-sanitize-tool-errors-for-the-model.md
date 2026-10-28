---
id: TASK-8.6
title: Restrict chat image URLs and sanitize tool errors for the model
status: To Do
assignee: []
created_date: '2026-10-28T08:55:00Z'
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

Agents accept https:// image URLs even though the BFF normally sends data:image payloads; arbitrary HTTPS can become provider-side fetch / tracking risk if agents are called outside the BFF. Tool exceptions are also stringified into ToolMessages, which can leak internals and feed indirect injection.

Closes doc-1 findings F (error channel) and G (URL allowlist).

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Chat multimodal input rejects non-data image URLs (or an explicit documented allowlist of trusted hosts) at the agents boundary
- [ ] #2 Tool failure messages returned to the model are sanitized (no raw stack traces / internal URLs / secrets); client-facing SSE errors stay similarly non-leaky
- [ ] #3 Tests cover rejected image URL schemes and sanitized tool error shaping
<!-- AC:END -->
