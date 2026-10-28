---
id: TASK-9.2
title: Implement Square OAuth connect, token storage, and disconnect
status: To Do
assignee: []
created_date: '2026-10-28T13:28:00Z'
updated_date: '2026-10-28T13:57:00Z'
labels:
  - square
  - oauth
  - graphql
  - web
dependencies:
  - TASK-9.1
  - TASK-9.8
references:
  - https://developer.squareup.com/docs/oauth-api/movetoprod
parent_task_id: TASK-9
priority: high
type: feature
ordinal: 31000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Sellers must authorize MenuYukti without sharing personal access tokens. After TASK-9.8 env/SDK scaffolding exists, implement hosted OAuth (HTTPS callback), encrypted per-workspace token storage, async refresh, and in-app disconnect/revoke. Ownership: GraphQL persistence + token refresh; web BFF/routes for start/callback UX as needed.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [ ] #1 Seller can start Square OAuth from MenuYukti and return via HTTPS redirect with success or denial messaging
- [ ] #2 Access and refresh tokens are stored AES-encrypted per workspace/seller; secrets and encryption keys are not in source control; staging and production keys differ
- [ ] #3 Tokens refresh asynchronously on a 7–14 day cadence; expired/revoked tokens surface a reconnect state
- [ ] #4 Seller can disconnect Square from MenuYukti UI; subsequent Square API calls stop using that connection
- [ ] #5 Automated tests cover happy-path callback, denial, and disconnect
<!-- AC:END -->
