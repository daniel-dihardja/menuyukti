# AI Explorer CI Policy

## Purpose
Define how autonomous AI exploratory runs are executed in CI and how artifacts/failures are handled.

## Workflow

- CI workflow file: `.github/workflows/ai-explorer.yml`
- Trigger modes:
  - nightly schedule (`cron`)
  - manual dispatch (`workflow_dispatch`)

## Mission Coverage

Default CI mission set:
- sales
- pairs
- scheduler
- attribution

## Artifact Retention

- Artifact bundle path:
  - `e2e-artifacts/ai-explorer/**`
  - web server log (`/tmp/menuyukti-web.log`)
- Retention: 14 days.

## Failure Policy

- CI run always uploads artifacts even when mission execution fails.
- Findings are triaged with severity rubric from `AI_PLAYWRIGHT_EXPLORATORY_TESTING_CONTRACT.md`.
- Recommended gating:
  - `critical`: release-blocking
  - `high`: triage-required before release approval
  - `medium/low/info`: non-blocking unless repeated or clustered on primary workflows

## Operational Prerequisites

- Seeded local/CI dataset with known analytics route IDs used by mission templates.
- Application instance reachable at configured base URL.
- Playwright browser runtime available in CI image.

## Runbook Notes

- If a mission fails at app boot level, inspect `/tmp/menuyukti-web.log` first.
- If findings explode due to environment mismatch, rerun with manual dispatch and explicit base URL.
- Keep mission templates deterministic and avoid destructive actions in CI.
