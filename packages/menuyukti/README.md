# Menuyukti

Python library for **menu and sales analytics**: normalization, POS helpers, and numeric analytics used by the GraphQL API and other consumers in this monorepo.

## Boundary: this package vs `apps/graphql`

- **Implement analytics here** — any non-trivial calculation, aggregation, or domain rule about sales/menu data belongs under `src/menuyukti/`, typically `core/analytics/`. Add or extend unit tests under `tests/`.
- **Keep GraphQL thin** — `apps/graphql` should load data (DB, uploads), enforce auth, map results to Strawberry types, and call into `menuyukti`. Avoid duplicating business logic in resolvers; if logic grows in GraphQL, move it down into this package.

Shared **persistence** (schema, migrations, SQLAlchemy models) stays in `apps/graphql`; this package stays free of app wiring and HTTP concerns.

## Layout

| Area | Role |
|------|------|
| `core/analytics/` | Analytics modules (`calculate_*.py`), helpers (`extract_*`, `pos_detector`, `registry`, `utils`), and POS-specific normalization (e.g. `esb/`) |
| `core/models/` | Shared data shapes (e.g. POS line items, mapping config) consumed by analytics and ingestion |

Prefer **`compute_*_from_orders`** (or similar) entry points when the API has order rows and the core wants a `DataFrame` or structured rows internally.

## Public API

Export stable entry points from `menuyukti.core.analytics` (`__init__.py` + `__all__`) so callers can `from menuyukti.core.analytics import ...` without reaching into deep module paths unless necessary.

## Versioning and contracts

Treat changes to public functions and return shapes as **API contracts**: callers include GraphQL and tests. When you change outputs or behavior, update callers and tests in the same change when possible.

## Tests and tooling

- Unit tests: `tests/` (e.g. `tests/unit/core/analytics/`).
- From this directory: `make test`, `make type-check` (see `Makefile`).
- The repo uses **uv**; this package is part of the workspace in the root `pyproject.toml`. Prefer `uv sync` / `uv run` from the workspace or app that depends on `menuyukti`.

For source-level notes, see `src/menuyukti/README.md`.
