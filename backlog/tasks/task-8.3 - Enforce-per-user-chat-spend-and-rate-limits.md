---
id: TASK-8.3
title: Enforce per-user chat spend and rate limits
status: To Do
assignee: []
created_date: '2026-10-28T08:54:00Z'
labels:
  - security
  - chat
  - advisor
dependencies: []
references:
  - apps/web/lib/pro-plan-api.ts
  - apps/agents/agents/core/chat/middleware.py
  - apps/web/app/api/chat/route.ts
documentation:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
parent_task_id: TASK-8
priority: high
type: enhancement
ordinal: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Chat usage is recorded but not enforced as a hard budget. requireProPlanApi no longer checks a plan. Recursion/history/Tavily bounds reduce runaway loops but do not stop a single user from burning LLM or Leonardo spend.

Closes doc-1 finding C.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Authenticated users hitting chat (and image generate via the advisor path) are subject to documented per-user limits (at least daily token and/or generation caps, or equivalent cost controls)
- [ ] #2 Over-limit requests fail closed with a clear client error before starting an unbounded stream when possible
- [ ] #3 Limits are covered by automated tests (unit or route-level)
<!-- AC:END -->
