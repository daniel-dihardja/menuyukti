# GraphQL Error Contract

This document defines the shared GraphQL error contract across `apps/graphql`, `apps/web`, and `apps/agents`.

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
