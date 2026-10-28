---
id: TASK-8.5
title: FOCUSED GraphQL authz review for chat advisor tool operations
status: To Do
assignee: []
created_date: '2026-10-28T08:55:00Z'
updated_date: '2026-10-28T09:03:00Z'
labels:
  - security
  - chat
  - advisor
  - graphql
dependencies: []
references:
  - .agents/skills/menuyukti-graphql-security-audit/SKILL.md
documentation:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
parent_task_id: TASK-8
priority: medium
type: spike
ordinal: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Advisor tools forward client-supplied locationId / analyticsRunId under the real user. Safety depends entirely on GraphQL ownership checks (confused deputy). doc-1 finding E calls for a FOCUSED audit of chat-touched operations rather than assuming resolvers are correct.

**Scope:** location, analytics runs, media library, knowledge search used by **general** advisor tools. Leonardo / post-generate GraphQL paths are out of scope for this spike while `chatImageAssistant` is off (revisit with TASK-8.4).

Use the menuyukti-graphql-security-audit skill in FOCUSED mode (authorization + trust-boundary).

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 FOCUSED GraphQL security audit is run for chat-touched queries used by general advisor tools (location, analytics runs, media, knowledge search)
- [ ] #2 Leonardo / posts generate paths are explicitly out of scope for this spike while chatImageAssistant is off (noted in audit notes)
- [ ] #3 Findings are recorded under the audit output path or summarized back into doc-1 / linked tasks
- [ ] #4 Any confirmed P0/P1 authz gaps get follow-up implementation tasks (or are fixed in-scope if tiny and agreed)
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-28T09:03:00Z

---

Narrowed away from post generate / Leonardo while Image Assistant is MVP-off.

---

<!-- COMMENTS:END -->
