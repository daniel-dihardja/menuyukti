---
id: doc-6
title: GraphQL error contract
type: specification
created_date: '2026-10-29T16:43:00Z'
updated_date: '2026-10-29T16:43:00Z'
tags:
  - graphql
  - errors
  - contract
---

# GraphQL error contract

**Audience:** engineering  
**Scope:** Shared GraphQL error contract across `apps/graphql`, `apps/web`, and `apps/agents`.  
**Kind:** specification.  
**Migrated from:** `docs/graphql-error-contract.md` (removed with root `docs/` cleanup).

---

## Backend (`apps/graphql`)

- Resolver `PermissionError` maps to GraphQL `extensions.code = FORBIDDEN`.
- Resolver `ValueError` maps to GraphQL `extensions.code = BAD_USER_INPUT`.
- Any other untyped resolver error maps to `extensions.code = INTERNAL_SERVER_ERROR`.

## Web (`apps/web`)

- API routes should return a normalized envelope:
  - `{ code, message, details? }`
- `GraphQLRequestError` reads backend `extensions.code` and maps to route errors:
  - `FORBIDDEN` -> `GRAPHQL_FORBIDDEN` (403)
  - `BAD_USER_INPUT` -> `GRAPHQL_BAD_USER_INPUT` (400)
  - fallback -> `INTERNAL_ERROR` (500)

## Agents (`apps/agents`)

- GraphQL transport classifies failures with:
  - `code` (stable machine value)
  - `retryable` (boolean)
  - `message` (human detail)
- Suggested handling:
  - `retryable=true`: retry with bounded backoff for idempotent operations
  - `retryable=false`: fail fast and emit structured run diagnostics
