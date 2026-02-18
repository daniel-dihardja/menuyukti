# E2E Data Initialization

Each E2E entrypoint initializes its data requirements automatically via:

- `apps/web/e2e/_helpers/data-setup.ts`
- `apps/web/scripts/run-e2e-suite.ts` (service lifecycle)

## Service lifecycle (automatic)

All `test:e2e:*` scripts run through:

- `node --import tsx scripts/run-e2e-suite.ts <e2e-file>`

This runner:

1. starts missing required services (`web`, `analytics`, `agents`)
2. waits until health endpoints are reachable
3. runs the selected E2E script
4. stops services it started (always, even on test failure)

By default required services are:

- `web,analytics,agents`

Override with:

- `E2E_REQUIRED_SERVICES=web`
- `E2E_REQUIRED_SERVICES=web,analytics`
- `E2E_REQUIRED_SERVICES=none`

Disable service management completely:

- `E2E_MANAGE_SERVICES=0`

## Shared services across multiple suites

To avoid repeated start/stop when running multiple E2E suites, use:

- `pnpm -C apps/web run test:e2e:batch`

This uses:

- `apps/web/scripts/run-e2e-shared-services.ts`

Behavior:

1. computes union of required services from selected suites
2. starts missing services once
3. runs suites sequentially
4. stops started services only after all selected suites finish

Select suites with:

```bash
E2E_SUITE_LIST=test:e2e:matrix,test:e2e:pairs,test:e2e:api:contracts pnpm -C apps/web run test:e2e:batch
```

Smoke preset:

```bash
pnpm -C apps/web run test:e2e:batch:smoke
```

## Policies

- `reuse`: do not mutate DB, use existing data.
- `seed`: run `db:seed` (and `db:seed:smoke` by default).
- `reset-seed`: run `db:reset`, then `db:seed` (and `db:seed:smoke`).

## How policy is chosen

Per test, resolution order is:

1. `E2E_DATA_POLICY_<TEST_ID>`
2. `E2E_DATA_POLICY`
3. test default policy in code

`<TEST_ID>` is uppercase with non-alphanumeric chars replaced by `_`.

Example:

- test id: `analytics-pairs-gui`
- env key: `E2E_DATA_POLICY_ANALYTICS_PAIRS_GUI`

## Usage examples

Run one suite with fresh reset + seed:

```bash
E2E_DATA_POLICY=reset-seed pnpm -C apps/web run test:e2e:matrix
```

Run only API contracts with fresh reset + seed:

```bash
E2E_DATA_POLICY_API_CONTRACTS=reset-seed pnpm -C apps/web run test:e2e:api:contracts
```

Use existing DB state (fast local loop):

```bash
E2E_DATA_POLICY=reuse pnpm -C apps/web run test:e2e:pairs
```

Run legacy agent decommission validation (no analytics/agents services required):

```bash
pnpm -C apps/web run test:e2e:agents:legacy-decommission
```

Run agent tool-contract and runtime-policy validation (agents service only):

```bash
pnpm -C apps/web run test:e2e:agents:tool-contract-policy
```

Run Agent Studio card metadata standard validation:

```bash
pnpm -C apps/web run test:e2e:agents:card-standard
```

Run learning release-loop gate validation (web + agents services):

```bash
pnpm -C apps/web run test:e2e:agents:learning-release-loop
```

Run Agent Studio overview grid + per-agent sandbox validation:

```bash
pnpm -C apps/web run test:e2e:agents:studio-overview-sandbox
```

Run seed-validation suite without starting app/agent services:

```bash
E2E_REQUIRED_SERVICES=none pnpm -C apps/web run test:e2e:seed
```

## Notes

- Browser/API E2E tests also verify API reachability before running.
- `seed-creation.e2e.ts` already contains seed-specific validation logic.
