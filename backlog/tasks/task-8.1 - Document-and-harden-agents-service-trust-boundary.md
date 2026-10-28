---
id: TASK-8.1
title: Document and harden agents service trust boundary
status: To Do
assignee: []
created_date: '2026-10-28T08:54:00Z'
labels:
  - security
  - chat
  - advisor
dependencies: []
references:
  - apps/agents/server.py
  - apps/web/lib/agents/headers.ts
documentation:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
parent_task_id: TASK-8
priority: high
type: chore
ordinal: 1
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Anyone who can reach apps/agents with the shared internal API key can set any X-Menuyukti-User-Id and act as that user. Production already fail-fasts without a key, but deployment exposure, rotation, and “who may call agents” are not spelled out as an operator checklist.

Closes doc-1 finding B (shared-secret impersonation) for the ops/docs side; token/JWT migration can be a follow-up if needed.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Runbook or security note documents that agents must not be publicly reachable and that GRAPHQL_INTERNAL_API_KEY / INTERNAL_API_KEY must be set, rotated, and shared only with trusted BFFs
- [ ] #2 Startup/prod requirements for the internal API key (and checkpoint DB) remain enforced; tests still cover missing-key failure in production-like config
- [ ] #3 Gap vs short-lived BFF→agents tokens is explicitly noted as optional follow-up (not silently assumed done)
<!-- AC:END -->
