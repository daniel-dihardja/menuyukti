# AGENTS.md — working in the Menuyukti monorepo

This file helps AI coding agents (Cursor, Claude Code, Codex, etc.) run the right tools and respect repo boundaries.

## Repository layout

| Area | Path | Stack |
|------|------|--------|
| Web | `apps/web` | Next.js, React, TypeScript, Clerk, Prisma, Vitest, next-intl |
| GraphQL API | `apps/graphql` | Python, Strawberry, uv, Ruff, pytest |
| Gentic agents | `apps/gentic-agents` | Go, Gentic SDK, HTTP API |

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
- Lint: `pnpm lint` — Typecheck: `pnpm typecheck` — Tests: `pnpm test`

### GraphQL (`apps/graphql`)

From `apps/graphql` (requires `uv`):

```bash
make install   # uv sync
make dev       # uvicorn with reload, port 8000
```

- Tests: `make test` — Lint/format: `make lint` / `make format`

### Gentic agents (`apps/gentic-agents`)

From `apps/gentic-agents`:

```bash
make run       # go run ./cmd/server (default ADDR=:7777)
```

- Build binary: `make build` — Tests: `make test` — Vet/fmt: `make vet` / `make fmt`
- Evals: `make eval`, `make eval-live` (integration; needs keys — see `Makefile`)

### All services

Root **`pnpm dev:all`** runs `./scripts/start-all-services.sh` when you need the full stack.

### Monorepo-wide (from repo root)

```bash
pnpm install
pnpm build
pnpm lint
pnpm check-types    # turbo; packages must define a check-types script to participate
pnpm format         # Prettier (TS/MD per config)
```

## Prisma (web)

Run from **`apps/web`**:

```bash
cd apps/web && pnpm exec prisma generate
cd apps/web && pnpm exec prisma migrate dev
```

Adjust flags as needed; schema lives under `apps/web/prisma/`.

## Off-limits or discouraged patterns

- **Node:** do not use `npm` / `yarn` for installs — use **pnpm**.
- **Python:** prefer **uv** (`uv sync`, `uv run`, `uv add`); avoid ad-hoc `pip install` as the default workflow.
- **Go (`gentic-agents`):** avoid new package-level globals; wire dependencies in `cmd/server/main.go`. Do not re-implement the Gentic **ReAct** loop — use `gentic/pkg/gentic/react` and existing flows.
- **Web:** no custom auth replacing Clerk; no hardcoded user-facing strings where **next-intl** messages should be used.

## Where to read more

- [`README.md`](README.md) — product and architecture overview
- [`project-structure.md`](project-structure.md) — Go agent API layout (reference)
- App READMEs: `apps/gentic-agents/README.md`, `apps/graphql/README.md`, `apps/web/README.md`
