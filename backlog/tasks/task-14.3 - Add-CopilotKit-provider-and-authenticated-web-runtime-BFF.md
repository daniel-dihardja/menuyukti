---
id: TASK-14.3
title: Add CopilotKit provider and authenticated web runtime BFF
status: To Do
assignee: []
created_date: '2026-11-01T09:10:00Z'
labels:
  - frontend
  - chat
  - security
dependencies:
  - TASK-14.1
  - TASK-14.2
references:
  - apps/web/app/api/chatkit/route.ts
  - apps/web/app/layout.tsx
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
parent_task_id: TASK-14
priority: high
type: feature
ordinal: 57000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Web currently proxies ChatKit through `/api/chatkit` and loads the OpenAI ChatKit CDN. CopilotKit needs a Next.js runtime/provider wired to the agents AG-UI endpoint while preserving Clerk auth and never letting the browser invent user ids for agents.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 CopilotKit React provider is mounted for the advisor (and inventar chat) surfaces
- [ ] #2 Web BFF/runtime forwards to agents with Clerk-derived user id and existing internal API key patterns
- [ ] #3 Browser cannot override the user identity header used by agents
- [ ] #4 Feature flag or route gate can enable CopilotKit path without forcing all users until UI cutover ships
<!-- AC:END -->
