---
id: TASK-8.4
title: Upgrade image generate to real human-in-the-loop approval
status: To Do
assignee: []
created_date: '2026-10-28T08:55:00Z'
labels:
  - security
  - chat
  - advisor
dependencies: []
references:
  - apps/agents/agents/core/chat/generate_confirmation_gate.py
  - apps/agents/agents/core/chat/generate_instagram_post_image.py
documentation:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
parent_task_id: TASK-8
priority: medium
type: enhancement
ordinal: 4
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Image assistant uses a code-level phrase gate (for example typed “generate”) rather than LangGraph interrupt() or a signed one-time approve token. General mode can still reach generate without that gate.

Closes doc-1 finding D: costly side effects need a real approval boundary, not prompt etiquette.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 First image generation (and other configured costly generates) cannot proceed without an explicit user approval signal that is not satisfied by free-form chat alone, or is cryptographically/session-bound (interrupt resume or equivalent)
- [ ] #2 General advisor mode either shares the same gate or documents why generate remains ungated there with compensating controls
- [ ] #3 Automated tests cover refuse-without-approval and allow-after-approval paths
<!-- AC:END -->
