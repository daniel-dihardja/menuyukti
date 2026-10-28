---
id: TASK-8.4
title: 'Deferred: real HITL for advisor Leonardo / Image Assistant generate'
status: To Do
assignee: []
created_date: '2026-10-28T08:55:00Z'
updated_date: '2026-10-28T09:03:00Z'
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
priority: low
type: enhancement
ordinal: 4
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

**Deferred** until `chatImageAssistant` is re-enabled in `apps/web/config/feature-flags.json`.

When Image Assistant returns, the soft phrase gate (`generate_confirmation_gate.py`) should be upgraded to LangGraph `interrupt()` or a signed one-time approve token. General mode historically could reach `generate_instagram_post_image` without that gate.

Do not implement as part of the current MVP advisor-security path. Resume this task when re-enabling Image Assistant / Leonardo in advisor chat.

Closes doc-1 finding D (deferred).

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Blocked on chatImageAssistant (or equivalent) being enabled for product again
- [ ] #2 When unblocked: first advisor image generation cannot proceed without an explicit user approval signal that is not free-form chat alone, or is session-bound (interrupt resume or equivalent)
- [ ] #3 When unblocked: automated tests cover refuse-without-approval and allow-after-approval
- [ ] #4 IG Studio Post Creator HITL (if any) is scoped separately and not assumed by this task
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-28T09:03:00Z

---

Deferred: no Leonardo support required in advisor while chatImageAssistant is off.

---

<!-- COMMENTS:END -->
