# Menuyukti

Menuyukti is an AI restaurant marketing SaaS for restaurant marketers and agencies. It turns POS and sales data into campaign-ready insights, menu promotion priorities, and AI-generated Instagram post schedules with content. The repo contains:

- `apps/web`: Next.js web app (UI + API routes)
- `apps/analytics`: FastAPI service for deterministic analytics and decisioning
- `apps/agents`: agent runtime and supporting utilities

## Key Capabilities

- POS file ingestion and normalization
- Sales analytics (KPIs, popularity index, heatmaps)
- Menu engineering matrix computation
- Marketing insights derived from sales performance
- Agentic AI workflows for campaign planning and Instagram post scheduling with content

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
- `DATABASE_URL` — database connection string
