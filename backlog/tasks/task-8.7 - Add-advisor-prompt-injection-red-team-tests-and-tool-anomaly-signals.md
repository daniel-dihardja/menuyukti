---
id: TASK-8.7
title: Add advisor prompt-injection red-team tests and tool anomaly signals
status: To Do
assignee: []
created_date: '2026-10-28T08:55:00Z'
labels:
  - security
  - chat
  - advisor
dependencies:
  - TASK-8.2
  - TASK-8.6
references:
  - apps/agents/tests/core/
documentation:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
parent_task_id: TASK-8
priority: low
type: task
ordinal: 7
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Guardrails drift without regression tests. doc-1 P2 items H–J call for advisor-specific injection/confused-deputy coverage and basic observability for anomalous tool use (generate spikes, web-search bursts).

Depends on untrusted-context labeling and URL/error hardening so tests assert the new controls rather than today’s softer baseline.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Automated tests (or a documented golden prompt suite runnable in CI) cover at least: jailbreak-style override attempt, attempt to pass foreign location via tool args (must fail via injection/config), and refuse generate without approval when applicable
- [ ] #2 Minimal observability exists for anomalous advisor tool patterns (logging and/or metrics for generate and search_web rates per user or thread)
- [ ] #3 doc-1 or the parent task notes what is covered vs still out of band (full DLP / dual-LLM)
<!-- AC:END -->
