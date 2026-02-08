# Menuyukti

Menuyukti is a menu analytics + promotion decision platform. The repo contains:

- `apps/web`: Next.js web app (UI + API routes)
- `apps/menu-analytics`: FastAPI service for deterministic analytics and decisioning
- `apps/agents`: agent runtime and supporting utilities

## Key Capabilities

- POS file ingestion and normalization
- Sales analytics (KPIs, popularity index, heatmaps)
- Menu engineering matrix computation
- Deterministic promotion decision pipeline
- Optional weekly schedule generation

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
cd apps/menu-analytics
make dev
```

### Run tests

```bash
cd apps/menu-analytics
uv run pytest
```

## Environment Variables

The web app expects:

- `ANALYTICS_API_URL` — base URL of the menu‑analytics service
- `DATABASE_URL` — database connection string
