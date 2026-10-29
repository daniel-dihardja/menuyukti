# FOCUSED GraphQL security audit — advisor chat tools

| Field      | Value                                                  |
| ---------- | ------------------------------------------------------ |
| Mode       | FOCUSED                                                |
| Scopes     | `authorization`, `trust-boundary`                      |
| Date (UTC) | 2026-10-28                                             |
| Commit     | `515e7dbd`                                             |
| Related    | Backlog TASK-8.5, doc-1 Chat advisor security overview |

## Scope

**In scope (reads used by general advisor tools):**

`location`, `analyticsRuns`, `orderMetrics`, `menuHeatmaps`, `menuEngineeringMatrix`, `menuCombos`, `mediaCollections`, `mediaAssets`, `searchKnowledge`.

**Explicitly out of scope:** Leonardo / post-generate GraphQL; inventar / `inventoryRefillForecast`; POS; CRM public paths; FULL scorecard / `latest/` baseline overwrite.

## Verdict

**Risk decision: CONDITIONAL**

Advisor-facing query resolvers inspected here consistently resolve `user_id` from GraphQL context and deny foreign location / analytics-run / workspace access via ownership helpers (`is_location_owner`, `get_analytics_run_if_owner`, `workspace_ids_for_user` / `is_workspace_member`) or knowledge scope filters. No confirmed P0 IDOR on these ops from static review.

Residual **trust-boundary** risk remains: GraphQL (and agents) treat `X-User-Id` as authoritative once `X-Internal-Api-Key` matches. That is by design for the BFF model but means a leaked key + network reachability is full impersonation (see TASK-8.1 runbook). Not a resolver bug; operational control required.

## Coverage

Static inspection of the listed resolvers + shared helpers + agents `graphql_headers` / web BFF stamping. Representative negative tests exist for knowledge cross-tenant isolation; broader cross-tenant matrices for every analytics field were not exhaustively re-run in this focused pass.

## Provisional category notes (not a full scorecard)

| Category             | Note                                                                             |
| -------------------- | -------------------------------------------------------------------------------- |
| Authorization / IDOR | Ownership helpers present on advisor ops; silent empty/`None` denial pattern     |
| Trust boundary       | Internal key middleware + production fail-fast; user id header trusted after key |

Do **not** treat this document as replacing a FULL audit baseline under `latest/`.
