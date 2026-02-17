# AI + Playwright Exploratory Testing Contract (v1)

## Purpose
Define deterministic contracts and guardrails for autonomous exploratory test runs that use AI reasoning with Playwright browser execution.

## Mission Contract

- Schema: `apps/web/e2e/ai-explorer/schemas/mission.schema.json`
- Runtime validator: `apps/web/e2e/ai-explorer/contracts.ts` (`missionSchema`)

Required mission fields:
- `schemaVersion`: `v1`
- `id`, `title`
- `baseUrl`
- `focusAreas`
- `guardrails`
- `scenarios[]`

Scenario contract:
- `id`, `name`, `route`, `objective`
- `actions[]` with typed action union:
  - `goto`, `click`, `fill`, `press`, `waitFor`, `screenshot`, `note`

## Findings Contract

- Schema: `apps/web/e2e/ai-explorer/schemas/findings-report.schema.json`
- Runtime validator: `apps/web/e2e/ai-explorer/contracts.ts` (`findingsReportSchema`)

Required finding fields:
- `id`, `missionId`, `scenarioId`
- `severity` (`critical|high|medium|low|info`)
- `title`, `summary`, `route`
- `reproducibleSteps[]`
- `evidence` (`screenshots[]`, `consoleErrors[]`, `networkErrors[]`)
- `confidence` (0..1)
- `suggestedFix` (nullable string)

## Guardrails

- Max steps per mission: bounded (`maxSteps`).
- Per-step timeout: bounded (`stepTimeoutMs`).
- Max run duration: bounded (`maxDurationMs`).
- Unsafe operations are disabled by default:
  - `allowDestructiveActions = false`
- Host/domain allowlist enforced via `allowedDomains`.

## Severity Policy

- `critical`: data loss/security exposure/crash in primary flow.
- `high`: primary workflow blocked or incorrect result with user impact.
- `medium`: degraded UX/functionality, workaround exists.
- `low`: polish/documentation/clarity issue.
- `info`: observation, no direct defect confirmed.

## Required Reproducibility Standard

Every non-info finding must include:
1. Route and explicit reproduction steps.
2. At least one screenshot.
3. Console/network evidence when runtime-related.
4. Confidence score and rationale.

## Feature Suggestion Policy

The AI explorer is expected to output feature suggestions in addition to defects.

Guidelines:
- Represent feature suggestions as `info` findings.
- Prefix title with `Feature Suggestion:`.
- Include:
  - pain pattern observed,
  - affected route(s),
  - expected value for marketer/analyst/operator workflow,
  - suggested implementation direction.
- Prefer suggestions only when friction is repeated across multiple missions or routes.

## Contract Versioning Policy

- Current: `v1`.
- Backward-compatible additions may use `v1.x`.
- Breaking changes require a new major version and migration note.
