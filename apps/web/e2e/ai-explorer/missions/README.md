# AI Explorer Mission Catalog

Reference mission templates:

- `sales.json`: `/analytics/sales` route exploration.
- `pairs.json`: `/analytics/1/pairs` route exploration.
- `scheduler.json`: `/analytics/1/scheduler` route exploration.
- `attribution.json`: `/analytics/1/attribution` route exploration.

Usage:

```bash
pnpm -C apps/web run test:e2e:ai -- --mission=apps/web/e2e/ai-explorer/missions/sales.json
```

Notes:
- Missions assume seeded data with `analyticsId=1`.
- Override route ids by editing the mission JSON.
- Keep `allowDestructiveActions=false` for exploratory quality runs.
