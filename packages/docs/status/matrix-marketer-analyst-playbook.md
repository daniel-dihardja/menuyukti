# Matrix Playbook for Restaurant Marketers and Menu Analysts

## Purpose
This playbook explains how to use `/analytics/{id}/matrix` to make weekly promotion, pricing, and menu lifecycle decisions with high confidence.

## Audience
- Restaurant marketers: decide what to promote this week and where to spend campaign budget.
- Menu analysts: decide what to reprice, redesign, or remove based on contribution margin and demand.

## Weekly Marketer Workflow
1. Open the matrix page and apply the `Push Winners` preset.
2. Review top items by revenue and margin in the unified table.
3. Open action explainability on candidate items and confirm recommendation rationale.
4. Build campaign shortlist from `PROMOTE` and `KEEP` items with strong margin.
5. Share the URL-filtered view with stakeholders for execution.

## Weekly Analyst Workflow
1. Open the matrix page and apply `Fix Pricing` and `Review Low Margin` presets.
2. Inspect low-margin but high-volume items first.
3. Use explainability tooltips to validate category/action consistency.
4. Create action list:
- `REPRICE`: adjust price, portion, bundle, or COGS.
- `REMOVE`: de-prioritize, redesign, or sunset.
5. Track actions in the next run and compare shifts by reusing saved filter URLs.

## Recommendation Semantics
- `KEEP`: baseline healthy; monitor only.
- `PROMOTE`: high margin with growth potential.
- `REPRICE`: demand exists but margin is below target.
- `REMOVE`: weak demand and weak margin.

## Data Trust Checks Before Action
1. Verify pipeline metadata on the matrix page (`Run`, `Quality`, `Freshness`).
2. Ensure quality status is acceptable before campaign or pricing decisions.
3. Check for missing COGS values (`—`) and resolve before final decisions.
4. Use action explainability to confirm recommendation is supported by real metrics.

## Operational Notes
- All filters are URL-based and shareable for reproducible analysis.
- Presets are deterministic and map to explicit filter logic.
- Telemetry events (`preset`, `filter`, `reset`, `reason opened`) are captured via schema-versioned matrix telemetry.

## Success Metrics
- Time to first actionable shortlist.
- Reduction in low-margin high-volume items over time.
- Increase in revenue share from `PROMOTE` and `KEEP` cohorts.
- Lower filter abandonment rate across weekly matrix reviews.
