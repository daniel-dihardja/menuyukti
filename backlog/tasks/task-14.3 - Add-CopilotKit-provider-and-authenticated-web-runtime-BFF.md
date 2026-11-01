---
id: TASK-14.3
title: Add CopilotKit provider and authenticated web runtime BFF
status: Done
assignee:
  - '@agent'
created_date: '2026-11-01T09:10:00Z'
updated_date: '2026-11-01T09:24:00Z'
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

- [x] #1 CopilotKit React provider is mounted for the advisor (and inventar chat) surfaces
- [x] #2 Web BFF/runtime forwards to agents with Clerk-derived user id and existing internal API key patterns
- [x] #3 Browser cannot override the user identity header used by agents
- [x] #4 Feature flag or route gate can enable CopilotKit path without forcing all users until UI cutover ships
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Add chatCopilotKit feature flag (default off).
2. pnpm add CopilotKit runtime + react + @ag-ui/client in apps/web.
3. Add /api/copilotkit route: requireProPlanApi, spend limits, HttpAgent with server-stamped buildAgentsHeaders(userId), forward allowlisted context headers only.
4. Add client CopilotKit provider wrapper for advisor surfaces gated by flag.
5. Smoke-typecheck the new modules.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Added chatCopilotKit flag (default off), /api/copilotkit single-route runtime with HttpAgent server headers via buildAgentsHeaders, AdvisorCopilotKitProvider + shell bridge on advisor panel, context-header allowlist tests. Pinned @ag-ui/client@1.0.2 for type compatibility.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Web Copilot Runtime BFF stamps Clerk user id server-side; browser only sends allowlisted context headers. Provider mounts when chatCopilotKit is on. Flag defaults off for dual-run. Vitest + tsc clean.

<!-- SECTION:FINAL_SUMMARY:END -->
