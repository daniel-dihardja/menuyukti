# Findings register — FOCUSED advisor chat tools

## FIND-GQL-ADV-001 — Shared-secret trust implies spoofable X-User-Id

| Field           | Value                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity        | P1 (ops / trust-boundary)                                                                                                                                       |
| Status          | VERIFIED (by design)                                                                                                                                            |
| Scopes          | trust-boundary                                                                                                                                                  |
| Evidence        | `apps/graphql/server.py` internal key middleware; `user_id_from_info` reads context `user_id` from `X-User-Id`; agents `graphql_headers` forward caller user id |
| Attack scenario | Spoofed `X-User-Id` with valid internal API key                                                                                                                 |
| Impact          | Full tenant impersonation on GraphQL (including advisor tools)                                                                                                  |
| Remediation     | Keep GraphQL/agents private; rotate keys (TASK-8.1 runbook). Optional follow-up: short-lived BFF→API tokens binding `sub`                                       |
| Follow-up tasks | None new — covered by TASK-8.1 docs; JWT remains optional                                                                                                       |

## FIND-GQL-ADV-002 — Advisor location / analytics ownership checks present

| Field           | Value                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity        | Informational (positive control)                                                                                                                                                                                                          |
| Status          | VERIFIED                                                                                                                                                                                                                                  |
| Scopes          | authorization                                                                                                                                                                                                                             |
| Evidence        | `locations.py` uses `is_location_owner`; `analytics_run.py` / `menu_heatmaps.py` / `menu_engineering_matrix.py` / `menu_combos.py` use `get_analytics_run_if_owner`; agents tools inject user id, pass client location/run as intent only |
| Attack scenario | User A passes user B’s `locationId` / `analyticsRunId`                                                                                                                                                                                    |
| Impact          | Mitigated: foreign ids yield empty/`None` when ownership fails                                                                                                                                                                            |
| Remediation     | None required for this spike                                                                                                                                                                                                              |
| Follow-up       | Prefer expanding negative tests for each chart query if FULL audit later                                                                                                                                                                  |

## FIND-GQL-ADV-003 — Media library scoped to workspace membership

| Field           | Value                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Severity        | Informational (positive control)                                                                             |
| Status          | VERIFIED                                                                                                     |
| Scopes          | authorization                                                                                                |
| Evidence        | `media_collections.py` filters by `workspace_ids_for_user`; single collection requires `is_workspace_member` |
| Attack scenario | Foreign `collectionId`                                                                                       |
| Impact          | Mitigated: empty list / null                                                                                 |
| Remediation     | None                                                                                                         |

## FIND-GQL-ADV-004 — Knowledge search tenant filters

| Field           | Value                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity        | Informational (positive control)                                                                                                                                |
| Status          | VERIFIED (code + test)                                                                                                                                          |
| Scopes          | authorization                                                                                                                                                   |
| Evidence        | `knowledge_search.py` requires `user_id`; `search_knowledge` service scopes; `tests/test_knowledge_rag.py` `test_location_scoped_doc_not_leaked_across_tenants` |
| Attack scenario | Pin foreign `locationId` to pull other tenant knowledge                                                                                                         |
| Impact          | Mitigated per service filters + test                                                                                                                            |
| Remediation     | None                                                                                                                                                            |

## Out of scope (not evaluated)

- Leonardo / Instagram post generate mutations
- Inventar refill forecast GraphQL
- Abuse/DoS complexity scoring, disclosure, injection FULL categories
