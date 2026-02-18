# 12. Agent Studio vs Analytics Pages (Dropdown)

## Why This Distinction Matters

Menuyukti has two complementary workspaces:

- **Analytics pages (dropdown pages)** for deterministic analysis.
- **Agent Studio pages** for guided recommendations and workflow orchestration.

You will get the best results by using both in sequence.

## Analytics Pages (Dropdown): Purpose

Analytics pages answer: **"What is happening in the data?"**

They are source-of-truth views with filters, tables, and charts. You use them to inspect evidence, validate assumptions, and export deterministic results.

Typical pages:

- `Matrix`: item-level action classification (`promote`, `improve/reprice`, `remove`, `keep`)
- `Heatmap`: daypart/time demand patterns
- `Pairs`: basket co-occurrence and combo opportunities
- `Scheduler`: weekly Instagram planning surface
- `Attribution`: social-post to sales impact evidence
- `Finance` / `COGS`: margin and cost-readiness context

## Agent Studio: Purpose

Agent Studio answers: **"What should I do next?"**

It orchestrates existing analytics signals into ready-to-execute recommendations, with confidence/readiness/evidence metadata and policy guardrails.

Typical agent outcomes:

- weekly marketer plan
- menu-profit action board
- consensus recommendation set
- what-if scenario ranking
- memory continuity context
- feedback-aware reranking
- learning release-loop decisions

## Key Differences

1. Analytics pages are deterministic analysis surfaces.
2. Agent pages are decision copilots built on top of those deterministic signals.
3. Analytics pages are best for exploration, validation, and exports.
4. Agent pages are best for prioritization, execution planning, and workflow handoff.
5. Analytics pages show raw and transformed metrics directly.
6. Agent pages package those metrics into actionable recommendations with guardrails.

## Recommended Workflow

1. Start in dropdown analytics pages to validate data quality/readiness and inspect evidence.
2. Open Agent Studio to generate recommended actions from that validated context.
3. Review confidence/readiness/evidence on agent outputs.
4. Execute through scheduler/operations pages.
5. Return to attribution and learning pages to capture outcomes.

## Practical Rule

- If you need to **understand** the data: use analytics pages.
- If you need to **decide and execute** quickly: use Agent Studio.
- If confidence/readiness is low: go back to analytics pages, fix data context first, then rerun agent workflows.
