# Roadmap Workflow Guide

This guide defines how implementation work must be executed in this project.

## Required Workflow

1. Commit all newly created open stories in `todo/`.
2. Start implementing one story.
3. When the story is finished, remove that story file from `todo/`.
4. Commit the deleted story file together with all implementation code changes for that story.

## Working Rules

- Implement one story at a time.
- Do not leave completed stories in `todo/`.
- A story is considered complete only when both are true:
  - implementation changes are done
  - the corresponding story file is deleted from `todo/` and included in the same commit

## Roadmap Directory Structure

- `todo/`: Open stories that are ready to be implemented.
- `complete/`: Completed stories kept for historical reference.
- `SPECS.md`: Current MVP/release specification and open-feature tracking.

## Markdown Story Spec

Every story file in `todo/` and `complete/` should follow this structure:

1. Title:
   - `# Story <id>: <short title>`
2. `## Story Metadata` with:
   - `Created Date: YYYY-MM-DD` (required)
   - `Status: \`todo\` | \`in_progress\` | \`complete\`` (required)
   - `Completed Date: YYYY-MM-DD` (required only when `Status` is `complete`)
   - `Parent: <epic-or-story-id>` (optional, for grouping)
3. `## Goal` (required)
4. `## Why This Matters` (required)
5. `## Scope` (required)
6. `## Acceptance Criteria` (required)
7. `## Deliverables` (required)

Optional sections:
- `## Data Engineering Requirements`
- `## Dependencies`
- `## Notes`

## Story Grouping

Story grouping is supported via metadata:

- Use `Parent` to link a story to a higher-level story/epic.
- Suggested format:
  - Parent epic story: `Parent: none` (or omit field)
  - Child story: `Parent: 73` (or other story/epic ID)

Recommendation:
- Keep grouping lightweight with `Parent` (as you suggested).
- If needed later, add `Type: epic|story|task` in metadata, but this is optional for now.

## Story Template

```md
# Story <id>: <short title>

## Story Metadata
- Created Date: YYYY-MM-DD
- Status: `todo`
- Parent: <id-or-none>

## Goal
<one clear outcome>

## Why This Matters
- <business/technical impact>

## Scope
- <in scope>
- <in scope>

## Acceptance Criteria
- <verifiable outcome>
- <verifiable outcome>

## Deliverables
- <artifact/code/docs/tests>
```

## DB Seed Workflow (Neon Snapshot)

Use this workflow to keep local data aligned with a known Neon snapshot.

### Canonical Commands

- Schema update path:
  - `pnpm -C apps/web run db:gen`
  - `pnpm -C apps/web run db:init`
  - `pnpm -C apps/web run db:seed`
- Full reset path:
  - `pnpm -C apps/web run db:reset`
  - Note: `db:reset` already runs Prisma seed automatically.

### Export Current Neon Data to SQL

- `pnpm -C apps/web run db:seed:export`
- Output file: `apps/web/prisma/seed/export/current_seed.sql`

### Guardrails

- Always verify `DATABASE_URL` target before export/seed.
- Do not run export against unintended production environments.
- Seed export is allowlist-based (`apps/web/prisma/seed/seed-tables.ts`).
- Keep sensitive/non-required tables out of the allowlist.

## Staged Pipeline Contract (Story 126)

The pipeline contract is codified in `apps/web/lib/etl/pipeline-contract.ts`.

- Stages:
  - `upload_ingest`
  - `cogs_enrichment`
  - `matrix_materialization`
- Stage dependencies:
  - `upload_ingest` has no dependencies.
  - `cogs_enrichment` depends on `upload_ingest`.
  - `matrix_materialization` depends on both `upload_ingest` and `cogs_enrichment`.
- Triggers:
  - `upload_complete`
  - `cogs_saved`
  - `manual_operation`
- Job status state machine:
  - `queued -> running -> succeeded|failed`
  - `queued -> failed` (timeout or guardrail failure)
- Stage error codes and retryability are centralized in:
  - `ETL_STAGE_ERROR_CODE`
  - `ETL_STAGE_ERROR_CLASSIFICATION`

## E2E Full Lifecycle Runner (Story 151)

Use these commands for cold-start E2E runs where services are down before execution:

- Smoke validation:
  - `pnpm -C apps/web run test:e2e:full:smoke`
- Full suite:
  - `pnpm -C apps/web run test:e2e:full`

Runner behavior:
- Starts `analytics`, `agents`, and `web`.
- Applies pre-test DB lifecycle (`db:reset`, `db:gen`, `db:init`, `db:seed`).
- Applies seed determinism precheck (`db:seed:smoke`) before suites.
- Runs selected E2E suites.
- Applies post-test `db:reset`.
- Stops all services and writes logs to:
  - `apps/web/e2e-artifacts/runner-logs/`

Shared DB guardrails:
- Configure from `apps/web/.env.e2e` (template: `.env.e2e.example`).
- Default forbidden DB pattern: `(prod|production)`.

CI gate:
- Workflow: `.github/workflows/mvp-release-gate.yml`
- Requires full gate pass (`test:e2e:full`) and uploads `apps/web/e2e-artifacts/`.
