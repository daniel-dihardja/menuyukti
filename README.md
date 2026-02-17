# Menuyukti

Menuyukti is an AI restaurant marketing SaaS for restaurant marketers and agencies. It turns POS and sales data into campaign-ready insights, AI-generated Instagram post schedules with content, and analytics that measure the real impact of social posts. The repo contains:

- `apps/web`: Next.js web app (UI + API routes)
- `apps/analytics`: FastAPI service for deterministic analytics and decisioning
- `apps/agents`: agent runtime and supporting utilities

## Key Capabilities

- POS file ingestion and normalization
- Sales analytics (KPIs, popularity index, heatmaps)
- Menu engineering matrix computation
- Marketing insights derived from sales performance
- Agentic AI workflows for campaign planning and Instagram post scheduling with content
- Social post impact analytics tied back to sales performance

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

### Run tests

```bash
cd apps/analytics
uv run pytest
```

## Environment Variables

The web app expects:

- `ANALYTICS_API_URL` — base URL of the menu‑analytics service
- `AGENTS_API_URL` — base URL of the agents service
- `DATABASE_URL` — database connection string

The agents service expects:

- `OPENAI_API_KEY` — OpenAI API key for tone generation
- `OPENAI_TONE_MODEL` — optional model override (defaults to `gpt-4o-mini`)
