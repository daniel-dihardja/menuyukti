---
id: TASK-9.8
title: Install Square SDK and configure env scaffolding
status: To Do
assignee: []
created_date: '2026-10-28T13:57:00Z'
labels:
  - square
  - graphql
  - config
dependencies:
  - TASK-9.1
references:
  - https://developer.squareup.com/docs/sdks/python
  - apps/graphql/.env.example
parent_task_id: TASK-9
priority: high
type: chore
ordinal: 37000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

No Square client library or env keys exist in the monorepo yet. OAuth and POS sync (TASK-9.2+) need a decided SDK, dependency install in the owning app(s), and documented sandbox/production configuration before feature work.

Default ownership (confirm in TASK-9.1): Square HTTP/OAuth client and sync live in `apps/graphql` (Python). Web only needs public Application ID / authorize URL wiring and callback route — not a second SDK unless the spike says otherwise. Do not create a separate Square product app or share package until sync proves reuse.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Official Square client dependency is added where TASK-9.1 decided (expected: Python SDK in apps/graphql via uv); lockfile updated
- [ ] #2 Env scaffolding documents required keys (e.g. application id/secret, environment sandbox|production, OAuth redirect base, token encryption key) in apps/graphql/.env.example and/or root .env.example without committing secrets
- [ ] #3 A minimal smoke path exists (script or test) that builds a Square client for sandbox using env config and fails clearly when misconfigured
- [ ] #4 README or short backlog note points implementers at sandbox vs production config; no production secrets required for local sandbox work
<!-- AC:END -->
