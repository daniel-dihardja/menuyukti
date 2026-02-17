# 11. E2E Full Lifecycle Runner (Cold Start)

## What This Feature Does

The E2E full lifecycle runner executes a complete test workflow from a cold start:

1. Starts required services (`analytics`, `agents`, `web`).
2. Runs DB lifecycle setup (`db:reset`, `db:gen`, `db:init`, `db:seed`).
3. Executes configured E2E suites.
4. Runs post-test DB reset.
5. Stops all started services and keeps service logs.

## Why It Matters

- Keeps E2E runs deterministic for release checks.
- Removes manual "start services first" setup drift.
- Protects the current shared DB with explicit safety guardrails.

## Required Setup

Create an E2E env profile:

- Copy `apps/web/.env.e2e.example` to `apps/web/.env.e2e`.
- Set `DATABASE_URL` for your current (non-production) environment.
- Keep:
  - `ANALYTICS_API_URL=http://127.0.0.1:8000`
  - `AGENTS_API_URL=http://127.0.0.1:8001`
  - `E2E_BASE_URL=http://127.0.0.1:3000`

## Safety Guardrails

The runner blocks execution when `DATABASE_URL` matches forbidden patterns.

- Default blocked pattern: `(prod|production)`
- Config keys:
  - `E2E_DB_FORBIDDEN_PATTERN`
  - `E2E_DB_REQUIRED_PATTERN` (optional allow constraint)
- Do not disable guardrails except for controlled local debugging.

## Commands

Smoke run (single suite):

```bash
pnpm -C apps/web run test:e2e:full:smoke
```

Full run (all configured suites):

```bash
pnpm -C apps/web run test:e2e:full
```

Override suite list:

```bash
E2E_SUITE_LIST="test:e2e:matrix,test:e2e:pairs" pnpm -C apps/web run test:e2e:full
```

## Output and Logs

- E2E screenshots/videos: `apps/web/e2e-artifacts/`
- Service runner logs:
  - `apps/web/e2e-artifacts/runner-logs/analytics.log`
  - `apps/web/e2e-artifacts/runner-logs/agents.log`
  - `apps/web/e2e-artifacts/runner-logs/web.log`

## Operational Notes (Current Shared DB Mode)

- This is a transition setup using the current DB, not a dedicated E2E database yet.
- Runner always resets DB before and after suites to minimize state leakage.
- Avoid running this flow while other users depend on the same DB state.
