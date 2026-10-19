# GraphQL security checklist (MenuYukti)

**Checklist version:** `1.0.0`  
Use check IDs in findings (`AUTH-01`, `AZ-03`, …). Map to categories in [scoring-methodology.md](scoring-methodology.md).

## Identity and authentication trust (`identity`)

| ID      | Check                                                                         | Evidence tips                                                    |
| ------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| AUTH-01 | GraphQL context derives `user_id` only from trusted request path              | `server.py` `GraphQLWithUserContext`; who may set `X-User-Id`    |
| AUTH-02 | `INTERNAL_API_KEY` / `X-Internal-Api-Key` required in production-like configs | Middleware; what happens when env unset                          |
| AUTH-03 | Exceptions to internal key (e.g. `/crm/v1/`) are intentional and scoped       | Path allowlist; no operator GraphQL bypass                       |
| AUTH-04 | Unauthenticated requests cannot run privileged operations                     | Missing `user_id` → empty query / mutation raise per conventions |
| AUTH-05 | User id is not accepted from client-controlled GraphQL variables alone        | Variables vs context                                             |

## Authorization / IDOR / tenant isolation (`authorization`)

| ID    | Check                                                                                   | Evidence tips                                 |
| ----- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| AZ-01 | Location-scoped queries use `is_location_owner` (or equivalent) before returning data   | Sample high-risk queries                      |
| AZ-02 | Location-scoped mutations use `require_location_owner` (or role-specific require)       | Deletes, refunds, bulk upserts, POS           |
| AZ-03 | Workspace-scoped APIs enforce membership / role                                         | `is_workspace_member`, manage-members helpers |
| AZ-04 | Analytics runs / child resources checked via owner helpers                              | `get_analytics_run_if_owner` etc.             |
| AZ-05 | IDOR: foreign integer/UUID ids yield deny (empty / error), not other tenants’ data      | Cross-user tests; sequential `locationId`     |
| AZ-06 | Nested field resolvers cannot widen access beyond parent authorization                  | Parent allowed but child loads by raw id      |
| AZ-07 | Public / CRM customer operations cannot escalate to operator GraphQL data               | Enrollment tokens, public menu, CRM routes    |
| AZ-08 | Silent deny (queries) vs raise (mutations) consistent; no existence oracle if sensitive | Error message diffs for foreign ids           |

## Abuse and DoS controls (`abuse-controls`)

| ID     | Check                                                             | Evidence tips                                       |
| ------ | ----------------------------------------------------------------- | --------------------------------------------------- |
| ABU-01 | Query depth limit enabled and bounded                             | `QueryDepthLimiter`, `QUERY_MAX_DEPTH`              |
| ABU-02 | Query complexity limit enabled                                    | `create_query_complexity_rule`                      |
| ABU-03 | Alias / token / field-selection limits enabled                    | `MaxAliasesLimiter`, `MaxTokensLimiter`, selections |
| ABU-04 | Limits apply in production schema wiring                          | `schema/__init__.py`                                |
| ABU-05 | Expensive analytics / list fields considered in complexity model  | Cost of unbounded lists                             |
| ABU-06 | HTTP-level rate limiting (if any) documented; gap noted if absent | Proxy / gateway / app middleware                    |

## Information disclosure (`disclosure`)

| ID     | Check                                                                  | Evidence tips                    |
| ------ | ---------------------------------------------------------------------- | -------------------------------- |
| DIS-01 | Production error responses do not leak stack traces / SQL              | `process_result` / error masking |
| DIS-02 | Introspection policy appropriate for environment                       | Dev vs prod                      |
| DIS-03 | Schema / playground not exposed publicly without auth in prod          | Deploy config, README vs code    |
| DIS-04 | Distinguishable errors do not enable cross-tenant resource enumeration | Foreign id responses             |

## Injection and unsafe resolvers (`injection`)

| ID     | Check                                                                           | Evidence tips            |
| ------ | ------------------------------------------------------------------------------- | ------------------------ |
| INJ-01 | ORM / parameterized queries; no string-built SQL from GraphQL args              | Raw SQL search           |
| INJ-02 | `Node` / JSON `data` validated by handlers; privileged keys not client-settable | `node_handlers/`         |
| INJ-03 | Bulk mutations bound size and re-check ownership per item                       | Bulk COGS / catalog      |
| INJ-04 | File / URL inputs (if any) validated; no SSRF from GraphQL args                 | Media / import mutations |

## Secrets and sensitive data (`secrets`)

| ID     | Check                                                        | Evidence tips              |
| ------ | ------------------------------------------------------------ | -------------------------- |
| SEC-01 | Secrets not in schema defaults, tests fixtures committed raw | `.env` patterns, test keys |
| SEC-02 | PII/CRM fields not over-exposed on broad queries             | CRM customer queries       |
| SEC-03 | Internal API key not logged in clear text                    | Logging helpers            |

## Client / BFF / agents trust boundary (`trust-boundary`)

| ID    | Check                                                                                    | Evidence tips                       |
| ----- | ---------------------------------------------------------------------------------------- | ----------------------------------- |
| TB-01 | `apps/web` sets `X-User-Id` from Clerk session only, not from request body               | `lib/graphql/client.ts`, API routes |
| TB-02 | Web BFF does not accept attacker-supplied user id overrides                              | Route handlers                      |
| TB-03 | Agents `graphql_post` uses service credentials + correct user scoping                    | `apps/agents`                       |
| TB-04 | GraphQL endpoint not browser-callable with spoofable headers in intended deploy topology | Network / key assumptions           |

## Authz automated testing (`testing`)

| ID     | Check                                                                   | Evidence tips                   |
| ------ | ----------------------------------------------------------------------- | ------------------------------- |
| TST-01 | Negative authz tests exist for representative mutations                 | `OTHER_USER` patterns           |
| TST-02 | Negative authz tests exist for representative queries / IDOR            | Foreign `location_id`           |
| TST-03 | Internal key / unauthenticated behavior covered                         | Middleware or integration tests |
| TST-04 | High-risk domains (POS refunds, delete location, CRM) have denial tests | Domain test modules             |
