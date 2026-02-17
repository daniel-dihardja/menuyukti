# 10. AI + Playwright Autonomous Testing

## What This Feature Is About

This feature runs autonomous exploratory testing missions against Menuyukti using Playwright browser automation and AI-oriented mission contracts.

It is designed to:
- discover UX issues and runtime defects beyond deterministic assertions,
- produce reproducible evidence (screenshots, action logs, error logs),
- generate triage-friendly reports,
- optionally prepare guarded auto-fix plans.

## Why It Brings Value

- Restaurant marketer workflows: catches clarity and navigation issues in sales/scheduler/attribution paths.
- Menu analyst workflows: catches KPI/table/filter usability and rendering issues in pairs/heatmap/analytics routes.
- Engineering team: receives actionable findings with evidence, not vague bug reports.

## Prerequisites

- Web app can run locally (`http://127.0.0.1:3000` by default).
- Seeded data exists for mission routes (default templates use `analyticsId=1`).
- Dependencies are installed in workspace.

## Core Building Blocks

- Mission contract and guardrails:
  - `packages/docs/AI_PLAYWRIGHT_EXPLORATORY_TESTING_CONTRACT.md`
  - `apps/web/e2e/ai-explorer/schemas/mission.schema.json`
  - `apps/web/e2e/ai-explorer/schemas/findings-report.schema.json`
- Playwright action adapter:
  - `apps/web/e2e/ai-explorer/adapter.ts`
- Mission runner and artifacts:
  - `apps/web/e2e/ai-explorer/run-mission.ts`
- Findings reporter:
  - `apps/web/e2e/ai-explorer/reporter.ts`
- Optional auto-fix planning:
  - `apps/web/e2e/ai-explorer/auto-fix.ts`

## How To Run Locally

1. Start the app:
```bash
pnpm -C apps/web dev
```

2. Run a reference mission:
```bash
pnpm -C apps/web run test:e2e:ai:sales
```

3. Check artifacts:
- `e2e-artifacts/ai-explorer/<runId>/findings.json`
- `e2e-artifacts/ai-explorer/<runId>/findings-summary.md`
- `e2e-artifacts/ai-explorer/<runId>/action-log.json`
- `e2e-artifacts/ai-explorer/<runId>/screenshots/*`

## Running Different Mission Templates

- Sales:
```bash
pnpm -C apps/web run test:e2e:ai:sales
```
- Pairs:
```bash
pnpm -C apps/web run test:e2e:ai:pairs
```
- Scheduler:
```bash
pnpm -C apps/web run test:e2e:ai:scheduler
```
- Attribution:
```bash
pnpm -C apps/web run test:e2e:ai:attribution
```

Template catalog:
- `apps/web/e2e/ai-explorer/missions/README.md`

## Mission Customization

Create a new mission JSON and run:
```bash
pnpm -C apps/web run test:e2e:ai -- --mission=apps/web/e2e/ai-explorer/missions/<your-mission>.json
```

Key fields to tune:
- `focusAreas`: exploration intent (runtime, UX, overflow, accessibility basics).
- `guardrails.maxSteps`: control exploration breadth.
- `guardrails.maxDurationMs`: cap runtime cost.
- `guardrails.allowDestructiveActions`: keep `false` for exploratory quality runs.

## Interpreting the Report

- `findings.json`: machine-readable triage payload.
- `findings-summary.md`: severity-grouped human summary.
- Severity meanings follow contract:
  - `critical`: release-blocking
  - `high`: major user workflow impact
  - `medium`: notable degradation with workaround
  - `low`: polish issue
  - `info`: observation

## Optional Auto-Fix Plan Mode

Generate safe auto-fix candidates from findings:
```bash
pnpm -C apps/web run test:e2e:ai:autofix -- --findings=e2e-artifacts/ai-explorer/<runId>/findings.json --enable=true
```

Outputs:
- `autofix-plan.md` (human-readable plan)
- `autofix-plan.json` (machine payload)

Guardrail:
- auto-fix mode is blocked unless `--enable=true` is explicitly passed.

## CI Usage

Workflow:
- `.github/workflows/ai-explorer.yml`

Policy:
- `packages/docs/AI_EXPLORER_CI_POLICY.md`

Recommended cadence:
- Nightly exploratory run for drift detection.
- Manual pre-release run for high-risk changes.

## Common Failure Modes and Recovery

- App not reachable:
  - verify dev server and base URL.
- Mission selector timeout:
  - selector outdated after UI change; patch mission action sequence.
- Too many low-value findings:
  - tighten focus areas and guardrail step budget.
- Runtime errors but no visual evidence:
  - inspect action log + console/network sections in findings report.
