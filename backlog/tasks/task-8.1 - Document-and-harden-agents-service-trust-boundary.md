---
id: TASK-8.1
title: Document and harden agents service trust boundary
status: Done
assignee: []
created_date: '2026-10-28T08:54:00Z'
updated_date: '2026-10-28T10:26:00Z'
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

- [x] #1 Runbook or security note documents that agents must not be publicly reachable and that GRAPHQL_INTERNAL_API_KEY / INTERNAL_API_KEY must be set, rotated, and shared only with trusted BFFs
- [x] #2 Startup/prod requirements for the internal API key (and checkpoint DB) remain enforced; tests still cover missing-key failure in production-like config
- [x] #3 Gap vs short-lived BFF→agents tokens is explicitly noted as optional follow-up (not silently assumed done)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Expand apps/agents/README.md Auth/deployment for advisor BFF→agents chat trust boundary. 2. Cross-link from doc-1. 3. Note JWT as optional follow-up. 4. Re-run key/startup tests.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

README Auth expanded to advisor trust-boundary runbook; doc-1 finding B links to it; JWT noted as follow-up. test_internal_api_key + test_startup_security: 8 passed.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Documented advisor BFF→agents trust boundary in apps/agents/README.md (private network, key rotation, impersonation risk). Cross-linked from doc-1. Existing key/startup tests still pass (8). JWT migration left as optional follow-up.

<!-- SECTION:FINAL_SUMMARY:END -->
