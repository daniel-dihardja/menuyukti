---
id: TASK-8.3
title: Enforce per-user chat LLM spend and rate limits
status: Done
assignee: []
created_date: '2026-10-28T08:54:00Z'
updated_date: '2026-10-28T10:28:00Z'
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

Chat usage is recorded but not enforced as a hard budget. requireProPlanApi no longer checks a plan. Recursion/history/Tavily bounds reduce runaway loops but do not stop a single user from burning chat LLM spend.

**Scope:** Advisor chat tokens / request rate only. Leonardo / image-generation caps are out of scope while `chatImageAssistant` is off (see deferred TASK-8.4).

Closes doc-1 finding C for the general advisor path.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Authenticated users hitting advisor chat are subject to documented per-user limits (at least daily token and/or request caps, or equivalent cost controls for the chat LLM path)
- [x] #2 Over-limit requests fail closed with a clear client error before starting an unbounded stream when possible
- [x] #3 Limits are covered by automated tests (unit or route-level)
- [x] #4 Acceptance does not require Leonardo/image-generation quotas while chatImageAssistant is disabled
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Helper enforce-chat-spend-limits using myAiUsageSummary. 2. Wire into /api/chat and /api/chatkit before stream. 3. Defaults 100 req / 500k tokens; fail open on usage query errors. 4. Vitest.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

BFF checkAdvisorChatSpendLimits on /api/chat and /api/chatkit; 100 req / 500k tokens defaults; fail open on usage query error; Vitest 6 passed.

<!-- SECTION:NOTES:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-28T09:03:00Z

---

Narrowed: no Leonardo spend caps while Image Assistant is feature-flagged off.

---

<!-- COMMENTS:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Enforced per-user daily advisor chat caps (100 requests / 500k tokens, env-overridable) via myAiUsageSummary before streaming on /api/chat and /api/chatkit. Over-limit returns 429. Usage query failures fail open with a log. No Leonardo quotas.

<!-- SECTION:FINAL_SUMMARY:END -->
