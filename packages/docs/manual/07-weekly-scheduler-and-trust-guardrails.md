# 07. Weekly Scheduler and Trust Guardrails

## What This Feature Is About

This feature converts deterministic recommendation outputs into a practical weekly Instagram posting plan.
Main workflow page:
- `/analytics/{analyticsId}/scheduler`

The scheduler is built for:
- restaurant marketers: execute weekly Instagram actions from data-backed recommendations.
- menu analysts: verify confidence, rationale, and readiness before campaign decisions are finalized.

It is the bridge from "analytics insight" to "execution plan".

## End-To-End Flow

1. Start from matrix recommendations (`promote` / `reprice`).
2. Open scheduler for the same analytics report.
3. Set target week (`weekStart` in URL state).
4. Add recommendation items (or blank manual entries) to schedule rows.
5. Set posting slot, daypart, and optional campaign/post linkage.
6. Save draft or finalize the weekly schedule.

## Core UI Areas

- Schedule status card:
  - current planner state and readiness context.
- Recommendation picker:
  - add prioritized items from matrix-style signals.
- Entry table:
  - edit slots, confidence, and rationale per row.
- Action bar:
  - save draft and finalize controls.

Related deterministic data links:
- Recommendation source: matrix action + action reason.
- Campaign identity: `instagram_campaigns`.
- Post identity: `instagram_posts`.
- Promoted item mapping: `instagram_post_promoted_items`.

## What You Can Edit Per Schedule Entry

- `canonicalMenuName` (menu item being promoted)
- `scheduledFor` (date-time posting slot)
- `daypart` (`morning`, `lunch`, `afternoon`, `evening`)
- `instagramCampaignId` (optional link)
- `instagramPostId` (optional link)
- `confidence` (`high`, `medium`, `low`, `blocked`)
- `status` (`draft`, `scheduled`, `published`, `cancelled`)
- `rationale` (deterministic reason snapshot)

## Confidence Usage Guidelines

- `high`: only when quality/freshness conditions are healthy.
- `medium`: acceptable for normal planning where some uncertainty exists.
- `low`: use for exploratory or manually added rows.
- `blocked`: data conditions are too weak for trusted execution.

## Trust and Guardrail Behavior

Scheduler readiness is computed from:
- pipeline quality status
- freshness age vs SLA
- presence of valid pipeline metadata

Readiness states:
- `ready`: normal scheduling behavior.
- `degraded`: confidence may be downgraded.
- `blocked`: generation/finalization can be blocked by policy.

Policy examples:
- No entry should remain `high` confidence under degraded readiness.
- Under blocked readiness, schedule confidence is forced toward blocked policy behavior.
- Finalization can be rejected when readiness is blocked.

## Suggested Weekly Operating Cadence

1. Generate and review recommendations early in the week.
2. Build draft schedule with rationale and campaign links.
3. Validate trust state (`ready` preferred) before finalization.
4. Finalize only after analyst and marketer review of confidence levels.
5. Re-open and adjust rows if readiness degrades after new uploads.

## Recovery Actions for Low-Readiness Scenarios

- If readiness is `degraded`:
  - keep planning in draft mode.
  - use lower-confidence entries for review, not immediate execution.
- If readiness is `blocked`:
  - rerun ingestion/ETL and resolve quality issues first.
  - return to scheduler after trust state improves.

## Example Workflow

- Matrix flags `Iced Latte` as `promote` with clear rationale.
- Scheduler proposes lunch slot in the selected week.
- Team links a campaign id, reviews confidence/readiness, then saves draft.
- Once trust state is acceptable, team finalizes and executes.

## Why It Delivers Real Value

- Marketers: fast weekly Instagram planning with execution-ready rows.
- Analysts: transparent trust policy and traceable decision metadata before campaign rollout.
