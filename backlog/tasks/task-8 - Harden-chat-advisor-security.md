---
id: TASK-8
title: Harden chat advisor security
status: To Do
assignee: []
created_date: '2026-10-28T08:54:00Z'
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

The advisor BFF→agents→GraphQL path already has solid identity plumbing (Clerk-owned user id, injected tool config, mode-scoped tools), but prompt-injection hardening, spend limits, service-trust hygiene, and real HITL for costly side effects are incomplete.

This initiative sequences remediations from doc-1 so work lands as small, reviewable PRs without blocking the whole program on one change.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Child tasks cover the doc-1 remediation order (service trust, untrusted context, spend limits, HITL, GraphQL authz focus, URL/error hardening, red-team/observability)
- [ ] #2 doc-1 remains the overview; each child links back to it
- [ ] #3 No child expands scope into unrelated GraphQL FULL audit or POS readiness
<!-- AC:END -->
