---
id: TASK-8.7
title: Add advisor prompt-injection red-team tests and tool anomaly signals
status: To Do
assignee: []
created_date: '2026-10-28T08:55:00Z'
updated_date: '2026-10-28T09:03:00Z'
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

Guardrails drift without regression tests. doc-1 P2 items call for advisor-specific injection/confused-deputy coverage and basic observability for anomalous tool use (e.g. web-search bursts).

**Scope:** general advisor only while `chatImageAssistant` is off — no Leonardo generate approval tests or generate-rate metrics required.

Depends on untrusted-context labeling and URL/error hardening so tests assert the new controls.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Automated tests (or a documented golden prompt suite runnable in CI) cover at least: jailbreak-style override attempt, and attempt to pass foreign location via tool args (must fail via injected config / authz)
- [ ] #2 Minimal observability exists for anomalous advisor tool patterns (logging and/or metrics for search_web or equivalent high-risk tools per user or thread)
- [ ] #3 No Leonardo generate approval or generate-spike metrics required while chatImageAssistant is off
- [ ] #4 doc-1 or the parent task notes what is covered vs still out of band (full DLP / dual-LLM / Image Assistant resume)
<!-- AC:END -->

## Comments

<!-- COMMENTS:BEGIN -->

created: 2026-10-28T09:03:00Z

---

Dropped Leonardo generate red-team and generate metrics from active AC.

---

<!-- COMMENTS:END -->
