---
id: TASK-8
title: Harden chat advisor security
status: To Do
assignee: []
created_date: '2026-10-28T08:54:00Z'
updated_date: '2026-10-28T09:03:00Z'
labels:
  - security
  - chat
  - advisor
dependencies: []
references:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
documentation:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
priority: high
type: enhancement
ordinal: 28000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

The advisor BFF→agents→GraphQL path already has solid identity plumbing (Clerk-owned user id, injected tool config, mode-scoped tools), but prompt-injection hardening, spend limits, and service-trust hygiene are incomplete.

**Scope note (2026-10-28):** Advisor Image Assistant is feature-flagged off (`chatImageAssistant` in `apps/web/config/feature-flags.json`). Leonardo image generate via the advisor is out of the active hardening path until that flag is re-enabled. IG Studio Post Creator remains a separate surface.

This initiative sequences remediations from doc-1 so work lands as small, reviewable PRs.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Active children cover service trust, untrusted context, chat LLM spend limits, GraphQL authz focus (non-Leonardo), URL/error hardening, and red-team/observability for the general advisor path
- [ ] #2 Leonardo / Image Assistant HITL work is deferred (TASK-8.4) until chatImageAssistant is re-enabled
- [ ] #3 doc-1 remains the overview; each child links back to it
- [ ] #4 No child expands scope into unrelated GraphQL FULL audit or POS readiness
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-28T09:03:00Z

---

Scope reduced: chatImageAssistant MVP-off; Leonardo advisor generate not required for active security remediations.

---

<!-- COMMENTS:END -->
