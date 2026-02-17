# 06. Agents and Data-Readiness Guardrails

## What This Feature Is About

Agents generate audience and tone outputs from structured analytics features, not raw spreadsheet rows. Guardrails ensure the system does not produce high-trust outputs when data conditions are unsafe.

This means agent output quality is anchored to deterministic data signals first, then language generation.

## What The Guardrail Checks

- Pipeline quality status
- Data freshness age (minutes) vs SLA threshold
- Availability of valid pipeline run metadata

## Why This Matters Operationally

- Marketers avoid publishing campaigns based on stale or failed snapshots.
- Analysts can require readiness evidence before accepting AI-assisted plans.
- Teams share one trust policy across matrix, heatmap, and scheduler workflows.

## Possible Readiness States

- `ready`: safe to use normally.
- `warn`: output allowed but should be treated as lower confidence.
- `blocked`: output request is rejected until data conditions improve.

## Recommended Team Policy

- `ready`: output can move into normal review and scheduling.
- `warn`: output can be drafted, but final publish should require human confirmation.
- `blocked`: do not proceed; trigger data recovery first.

## How To Use

1. Open the agents screen and select location + analytics report.
2. Run `audience` or `tone` agent.
3. Check guardrail/readiness response:
   - if `ready`: proceed.
   - if `warn`: proceed with caution and annotate review.
   - if `blocked`: refresh data pipeline first.

## Example

- Fresh upload completed with quality `passed` -> agent returns `ready`.
- Data is older than freshness SLA -> agent returns `warn`.
- Quality is `failed` -> agent returns `blocked` and no trusted output.

## Why It Delivers Real Value

- Marketers: prevents publishing campaigns based on stale/low-quality data.
- Analysts: aligns AI-assisted outputs with strict ETL quality standards.

## Recommendation

Treat guardrail state as mandatory context in every agent-driven workflow or decision meeting.
Log decisions made under `warn` explicitly, so teams can audit risk tradeoffs later.
