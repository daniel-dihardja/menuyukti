# AGENTS.md — working in the Menuyukti monorepo

This file helps AI coding agents (Cursor, Claude Code, Codex, etc.) run the right tools and respect repo boundaries.

## Repository layout

| Area          | Path                 | Stack                                                                   |
| ------------- | -------------------- | ----------------------------------------------------------------------- |
| Web           | `apps/web`           | Next.js, React, TypeScript, Clerk, Vitest, next-intl (data via GraphQL) |
| GraphQL API   | `apps/graphql`       | Python, Strawberry, uv, Ruff, pytest                                    |
| Gentic agents | `apps/gentic-agents` | Go, Gentic SDK, HTTP API                                                |

**pnpm workspaces:** `apps/*`, `packages/*`. **Python (uv):** root `pyproject.toml` + `apps/graphql`, `packages/menuyukti`.

Persistent Cursor guidance lives in **`.cursor/rules/*.mdc`**.

## Environment and secrets

- Each app may use a local **`.env`** (see each app’s README or `.env.example` where present).
- **Never commit** secrets. Repo `.gitignore` includes `.env`, **`creds`**, and other sensitive paths — do not paste real keys into code or docs.

## How to run services locally

### Web (`apps/web`)

```bash
cd apps/web && pnpm dev
```

- Production build: `pnpm build` then `pnpm start`
- Lint: `pnpm lint` — Typecheck: `pnpm typecheck` / `pnpm check-types` (same as typecheck) — Tests: `pnpm test`

### GraphQL (`apps/graphql`)

From `apps/graphql` (requires `uv`):

```bash
make install   # uv sync --all-groups (includes Ruff + mypy dev tools)
make dev       # uvicorn with reload, port 8000
```

- Tests: `make test` — Lint/format: `make lint` / `make format` — Types: `make typecheck` (mypy)

### Gentic agents (`apps/gentic-agents`)

From `apps/gentic-agents`:

```bash
make run       # go run ./cmd/server (default ADDR=:7777)
```

- Build binary: `make build` — Tests: `make test` — Vet/fmt: `make vet` / `make fmt` — Lint: `make lint` ([golangci-lint](https://golangci-lint.run/welcome/install/); also used in CI)
- Evals: `make eval`, `make eval-live` (integration; needs keys — see `Makefile`)

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

- **GitHub Actions:** `.github/workflows/ci.yml` runs on pushes and pull requests to `main` and `develop` (Prettier check, Turbo `check-types` + `lint`, GraphQL Ruff/mypy/pytest, Go tests + golangci-lint for `apps/gentic-agents` and `packages/gentic`).
- **Pre-commit:** Husky runs [lint-staged](https://github.com/lint-staged/lint-staged) (`lint-staged.config.mjs`): Prettier on staged TS/MD/CSS, Ruff on `apps/graphql` Python, ESLint on `apps/web` and `packages/ui`. After `pnpm install`, the `prepare` script registers Husky (requires a writable `.git` in dev).
- **Suggested checks before a PR:** from the repo root run `pnpm format-check`, `pnpm check-types`, `pnpm lint`; from `apps/graphql` run `make lint`, `make typecheck`, `make test`; from `apps/gentic-agents` and `packages/gentic` run `go test ./...` and `make lint` (or rely on CI for golangci-lint).

## Off-limits or discouraged patterns

- **Node:** do not use `npm` / `yarn` for installs — use **pnpm**.
- **Python:** prefer **uv** (`uv sync`, `uv run`, `uv add`); avoid ad-hoc `pip install` as the default workflow.
- **Go (`gentic-agents`):** avoid new package-level globals; wire dependencies in `cmd/server/main.go`. Do not re-implement the Gentic **ReAct** loop — use `gentic/pkg/gentic/react` and existing flows.
- **Web:** no custom auth replacing Clerk; no hardcoded user-facing strings where **next-intl** messages should be used.

## Where to read more

- [`README.md`](README.md) — product and architecture overview
- [`project-structure.md`](project-structure.md) — Go agent API layout (reference)
- App READMEs: `apps/gentic-agents/README.md`, `apps/graphql/README.md`, `apps/web/README.md`
