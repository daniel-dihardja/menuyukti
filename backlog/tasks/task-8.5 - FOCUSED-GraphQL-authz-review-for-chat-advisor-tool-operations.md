---
id: TASK-8.5
title: FOCUSED GraphQL authz review for chat advisor tool operations
status: To Do
assignee: []
created_date: '2026-10-28T08:55:00Z'
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

Advisor tools forward client-supplied locationId / analyticsRunId / postId under the real user. Safety depends entirely on GraphQL ownership checks (confused deputy). doc-1 finding E calls for a FOCUSED audit of chat-touched operations rather than assuming resolvers are correct.

Use the menuyukti-graphql-security-audit skill in FOCUSED mode (authorization + trust-boundary) scoped to chat tool GraphQL ops.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 FOCUSED GraphQL security audit is run for chat-touched queries/mutations (location, analytics runs, media, knowledge search, post generate path)
- [ ] #2 Findings are recorded under the audit output path or summarized back into doc-1 / linked tasks
- [ ] #3 Any confirmed P0/P1 authz gaps get follow-up implementation tasks (or are fixed in-scope if tiny and agreed)
<!-- AC:END -->
