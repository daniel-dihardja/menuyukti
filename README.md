# Menuyukti

Menuyukti is an AI restaurant marketing SaaS for restaurant marketers and agencies. It turns POS and sales data into campaign-ready insights, AI-generated Instagram post schedules with content, and analytics that measure the real impact of social posts. The repo contains:

- `apps/web`: Next.js web app (UI + API routes)
- `apps/analytics`: FastAPI service for deterministic analytics and decisioning
- `apps/agents`: FastAPI agent service (contract-first orchestration endpoints)

## Key Capabilities

- POS file ingestion and normalization
- Sales analytics (KPIs, popularity index, heatmaps)
- Menu engineering matrix computation
- Marketing insights derived from sales performance
- Agentic AI workflows for campaign planning and Instagram post scheduling with content
- Social post impact analytics tied back to sales performance

## Docs and Planning

- Planning workspace: `packages/docs/planning/`
- Active stories: `packages/docs/planning/todo/`
- Archived stories/epics: `packages/docs/planning/archive/`
- Planning workflow config: `planning-workflow.config.yaml`
- Current archived AI-agentic epic:
  - `packages/docs/planning/archive/EPIC-AI-AGENTIC-SYSTEM/epic-ai-agentic-system.md`
- Agent service manual:
  - `apps/agents/README.md`

## Development

### Install

```bash
pnpm install
```

### Web app

```bash
cd apps/web
pnpm dev
```

### Web DB reset and seed

```bash
pnpm -C apps/web run db:gen
pnpm -C apps/web run db:init
pnpm -C apps/web run db:seed
```

Full reset flow:

```bash
pnpm -C apps/web run db:reset
```

`db:reset` already applies migrations and runs seed automatically.

### Start all services (recommended)

From the project root:

```bash
pnpm run dev:all
```

This command will:

- run web DB lifecycle (`db:reset`, `db:gen`, `db:init`, `db:seed`)
- start analytics service on `127.0.0.1:8000`
- start agents service on `127.0.0.1:8001`
- start web app on `127.0.0.1:3000`

You can skip DB steps if needed:

```bash
RUN_DB_RESET=0 RUN_DB_GEN=0 RUN_DB_INIT=0 RUN_DB_SEED=0 pnpm run dev:all
```

### Seed with specific scenarios

To seed the database with a specific scenario instead of the default, use:

```bash
cd apps/web
pnpm db:seed:v2 star-item          # Seed with star-item scenario
pnpm db:seed:v2 thriving-cafe      # Seed with thriving-cafe scenario
pnpm db:seed:v2 struggling-restaurant  # Seed with struggling-restaurant scenario
```

To see available scenarios:

```bash
cd apps/web
pnpm db:seed:v2 --list
```

To seed all scenarios at once:

```bash
cd apps/web
pnpm db:seed:v2 --all
```

### Export current Neon data snapshot for seed

```bash
pnpm -C apps/web run db:seed:export
```

SQL export output:

- `apps/web/prisma/seed/export/current_seed.sql`

### Menu analytics service

```bash
cd apps/analytics
make dev
```

### Agents service

```bash
uv run --project apps/agents uvicorn agent.api:app --app-dir apps/agents/src --host 127.0.0.1 --port 8001
```

### Run tests

```bash
cd apps/analytics
uv run pytest
```

```bash
uv run --project apps/agents pytest apps/agents/tests/integration_tests
```

## Environment Variables

The web app expects:

- `ANALYTICS_API_URL` — base URL of the menu‑analytics service
- `AGENTS_API_URL` — base URL of the agents service
- `DATABASE_URL` — database connection string

Agents service environment:

- Required:
  - `AGENTS_LLM_ENABLED` — `true|false` to enable live provider runtime.
  - `AGENTS_LLM_PROVIDER` — `mock|openai`.
- Optional guardrail mode:
  - `AGENTS_LLM_FAILURE_MODE` — `fallback|blocked` (default `fallback`).
- Required when `AGENTS_LLM_PROVIDER=openai`:
  - `OPENAI_API_KEY`.
- Optional per-agent overrides:
  - `AGENTS_MODEL_ID_<AGENT_ID_NORMALIZED>`
  - `AGENTS_PROMPT_VERSION_<AGENT_ID_NORMALIZED>`
