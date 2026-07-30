---
name: menuyukti-graphql
description: >-
  GraphQL API app (apps/graphql): Strawberry schema, query modules, services, SQLAlchemy and Alembic,
  reports/transform integration with packages/menuyukti, auth, and tests. Use when adding queries or
  mutations for web/agents, resolver logic, migrations, calendar entries, or analytics-shaped API fields.
---

# Menuyukti: `apps/graphql`

Python **Strawberry** API: **single persistence layer** (SQLAlchemy + Alembic) and structured reads/writes for **`apps/web`** and **`apps/agents`**.

For monorepo boundaries, see [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md). For resolver/auth conventions, see [`.cursor/rules/python-graphql-conventions.mdc`](../../../.cursor/rules/python-graphql-conventions.mdc). For pandas analytics logic, see [`menuyukti-analytics`](../menuyukti-analytics/SKILL.md).

## Companion skills

When implementing in **`apps/graphql`**, follow these skills in addition to this doc and the design rules below:

- [`graphql-architect`](../graphql-architect/SKILL.md) — Schema design, federation-style thinking, DataLoader-style patterns, subscriptions guidance.
- [`python-design-patterns`](../python-design-patterns/SKILL.md) — Structure, layering, composition.

## Layout

| Area            | Path                                                                              | Role                                                                 |
| --------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Schema root     | [`apps/graphql/schema/query.py`](../../../apps/graphql/schema/query.py)           | Composes query type from mixins.                                     |
| Query modules   | [`apps/graphql/schema/queries/`](../../../apps/graphql/schema/queries/)           | Feature queries (locations, analytics runs, calendar, …).            |
| Mutations       | [`apps/graphql/schema/mutations/`](../../../apps/graphql/schema/mutations/)       | Create/update/delete and domain writes.                              |
| Services        | [`apps/graphql/services/`](../../../apps/graphql/services/)                       | Domain orchestration (e.g. menu engineering).                        |
| Ingest / frames | [`apps/graphql/reports/transform.py`](../../../apps/graphql/reports/transform.py) | Rows → DataFrame → `packages/menuyukti` `calculate_*` / `compute_*`. |
| Migrations      | [`apps/graphql/alembic/`](../../../apps/graphql/alembic/)                         | Alembic revisions; **only** here for product schema.                 |
| Tests           | [`apps/graphql/tests/`](../../../apps/graphql/tests/)                             | Pytest.                                                              |

Commands: [AGENTS.md](../../../AGENTS.md) § GraphQL API. Deep SQLAlchemy patterns: [`.agents/skills/sqlalchemy-postgres/SKILL.md`](../sqlalchemy-postgres/SKILL.md).

## Design rules

1. **Schema** — types and query fields under `schema/queries/`; wire into [`query.py`](../../../apps/graphql/schema/query.py); follow [python-graphql-conventions](../../../.cursor/rules/python-graphql-conventions.mdc) for auth/session.
2. **Logic** — non-trivial math and pandas in [`packages/menuyukti`](../../../packages/menuyukti); resolvers map ORM rows to API types (avoid ad hoc frames in resolvers — prefer `reports/transform` helpers).
3. **Persistence** — new tables/columns **only** in `apps/graphql` (Alembic).
4. **Tests** — add coverage under `apps/graphql/tests/`.
5. **Generic `Node`** — polymorphic `node` rows (`type` + JSON `data`) still exist for some product entities; use `GenericHandler` / type-specific handlers under `schema/node_handlers/` when needed. **Do not** treat workflow-container / milestone export-import as live product APIs.

## Calendar

Manual calendar entries and scheduler-calendar reads live under calendar query/mutation modules (e.g. `scheduler_calendar`, `create_calendar_entry` / `update_calendar_entry`). Prefer **manual entries**; do not reintroduce scheduler-milestone / workflow `sourceRef` linkage as the product model.

## Agents-facing queries

`apps/agents` calls GraphQL via `graphql_post` — see [`menuyukti-agents`](../menuyukti-agents/SKILL.md). When adding fields used by chat tools:

- Keep response shapes **stable** and **JSON-friendly**.

Example query/service touchpoints (not exhaustive): [`menu_heatmaps.py`](../../../apps/graphql/schema/queries/menu_heatmaps.py), [`services/menu_engineering.py`](../../../apps/graphql/services/menu_engineering.py), [`instagram_signals.py`](../../../apps/graphql/schema/queries/instagram_signals.py).

## Checklist (GraphQL-only)

1. **Types & queries** — new modules under `schema/queries/`; compose in `query.py`.
2. **Mutations** — under `schema/mutations/` when writing data.
3. **Analytics** — delegate to `packages/menuyukti` via `reports/transform` (or equivalent helpers), not inline in resolvers.
4. **Migrations** — `alembic revision` + upgrade path in `apps/graphql`.
5. **Tests** — resolver and integration tests in `apps/graphql/tests/`.

## Related

| Topic             | Skill                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Chat agents       | [`menuyukti-agents`](../menuyukti-agents/SKILL.md)                     |
| Analytics package | [`menuyukti-analytics`](../menuyukti-analytics/SKILL.md)               |
| Web consumer      | [`menuyukti-web`](../menuyukti-web/SKILL.md)                           |
| Monorepo map      | [`menuyukti-repo-orientation`](../menuyukti-repo-orientation/SKILL.md) |

## Canonical docs

- [`apps/graphql/README.md`](../../../apps/graphql/README.md)
- [`packages/menuyukti/README.md`](../../../packages/menuyukti/README.md)
- [`AGENTS.md`](../../../AGENTS.md)

## Progressive disclosure

Split long schema or migration notes into `reference.md` in this folder if this file grows.
