# AGENTS.md — working in the Menuyukti monorepo

This file helps AI coding agents (Cursor, Claude Code, Codex, etc.) run the right tools and respect repo boundaries.

## Repository layout

| Area             | Path           | Stack                                                                   |
| ---------------- | -------------- | ----------------------------------------------------------------------- |
| Web              | `apps/web`     | Next.js, React, TypeScript, Clerk, Vitest, next-intl (data via GraphQL) |
| GraphQL API      | `apps/graphql` | Python, Strawberry, uv, Ruff, pytest                                    |
| LangGraph agents | `apps/agents`  | Python, FastAPI, LangChain / LangGraph, OpenAI, uv, Ruff, pytest        |

**pnpm workspaces:** `apps/*`, `packages/*`. **Python (uv):** root `pyproject.toml` + `apps/graphql`, `apps/agents`, `packages/menuyukti`.

Persistent Cursor guidance lives in **`.cursor/rules/*.mdc`**.

Menuyukti-specific agent workflows (e.g. new GraphQL data providers) live under **`.agents/skills/menuyukti-*/`** — see [`menuyukti-repo-orientation`](.agents/skills/menuyukti-repo-orientation/SKILL.md) (boundaries, DB, pnpm vs uv), [`menuyukti-data-provider`](.agents/skills/menuyukti-data-provider/SKILL.md), and [`menuyukti-analytics`](.agents/skills/menuyukti-analytics/SKILL.md) (`packages/menuyukti` analytics conventions and Instagram signals).

## Environment and secrets

- Each app may use a local **`.env`** (see each app’s README or `.env.example` where present).
- **Never commit** secrets. Repo `.gitignore` includes `.env`, **`creds`**, and other sensitive paths — do not paste real keys into code or docs.

## How to run services locally

### Web (`apps/web`)

```bash
cd apps/web && pnpm dev
```

- Production build: `pnpm build` then `pnpm start`
- Lint: `pnpm lint` — Typecheck: `pnpm typecheck` / `pnpm check-types` (same as typecheck) — Format: `pnpm format:check` / `pnpm format` (includes `messages/*.json`) — Tests: `pnpm test`

### GraphQL (`apps/graphql`)

From `apps/graphql` (requires `uv`):

```bash
make install   # uv sync --all-groups (includes Ruff + mypy dev tools)
make dev       # uvicorn with reload, port 8000
make db-upgrade   # Alembic: apply migrations (set DATABASE_URL in .env)
```

- Tests: `make test` — Lint/format: `make lint` / `make format` — Types: `make typecheck` (mypy)
- DB schema: Alembic under `apps/graphql/alembic/` — see `apps/graphql/README.md`.

### LangGraph agents (`apps/agents`)

From `apps/agents` (requires `uv`):

```bash
make install   # uv sync --all-groups
make dev       # FastAPI + uvicorn reload, port 8001
```

- Streaming chat: `POST /chat` (SSE) — Health: `GET /health` — Tests: `make test` — Lint/format: `make lint` / `make format` — Types: `make typecheck` (mypy)
- Set `OPENAI_API_KEY` in `.env` (see `.env.example`).

### All services

Root **`pnpm dev:all`** runs `./scripts/start-all-services.sh` when you need the full stack.

### Monorepo-wide (from repo root)

```bash
pnpm install
pnpm build
pnpm lint
pnpm check-types    # turbo; packages must define a check-types script to participate
pnpm format         # Prettier (TS/MD/CSS; see `.prettierrc.json` and `.prettierignore`)
pnpm format-check   # Prettier check only (CI uses this)
```

Database schema, migrations, and persistence are implemented in **`apps/graphql`** (see that app’s `Makefile`, `data_sources/`, and docs).

## Quality gates and CI

- **GitHub Actions:** `.github/workflows/ci.yml` runs on pushes and pull requests to `main` and `develop` (Prettier check, Turbo `check-types` + `lint` + `test`, GraphQL and agents Ruff/mypy/pytest).
- **Pre-commit:** Husky runs [lint-staged](https://github.com/lint-staged/lint-staged) (`lint-staged.config.mjs`): Prettier on staged TS/MD/CSS, Ruff on `apps/graphql` and `apps/agents` Python, ESLint on `apps/web` and `packages/ui`. After `pnpm install`, the `prepare` script registers Husky (requires a writable `.git` in dev).
- **Suggested checks before a PR:** from the repo root run `pnpm format-check`, `pnpm check-types`, `pnpm lint`, `pnpm test`; from `apps/graphql` run `make lint`, `make typecheck`, `make test`; from `apps/agents` run `make lint`, `make typecheck`, `make test`.

## Off-limits or discouraged patterns

- **Node:** do not use `npm` / `yarn` for installs — use **pnpm**.
- **Python:** prefer **uv** (`uv sync`, `uv run`, `uv add`); avoid ad-hoc `pip install` as the default workflow.
- **Web:** no custom auth replacing Clerk; no hardcoded user-facing strings where **next-intl** messages should be used.

## Where to read more

- [`README.md`](README.md) — product and architecture overview
- App READMEs: `apps/agents/README.md`, `apps/graphql/README.md`, `apps/web/README.md`
