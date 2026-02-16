# 03. Filters, Presets, and Shareable Views

## What This Feature Is About

This feature helps users isolate exactly the items they need for a specific decision context, then share the same context with teammates via URL.

## Filter Controls

- Text search (menu item)
- Category filter
- Action filter
- Margin min/max
- Units sold min/max
- Sort and sort order

## Smart Presets

Presets are predefined decision views, for example:

- `Push Winners`: promotion candidates with strong margin profile.
- `Fix Pricing`: items likely needing pricing/COGS correction.
- `Underperformers`: low-demand low-margin candidates for removal/rework.

## How To Use

1. Open `/analytics/{analyticsId}/matrix`.
2. Apply filters or click a preset.
3. Validate resulting item list.
4. Copy URL and share with stakeholders.

## Example

Marketing lead shares a URL with `actions=promote&marginMin=0.45`.
Analyst opens the same URL and sees the exact same candidate set.

## Why It Delivers Real Value

- Marketers: faster campaign alignment and approval discussions.
- Analysts: fewer disagreements caused by different filter states.

## Good Practice

When creating weekly reports, keep one canonical shared URL per workflow (campaign planning, pricing review, removal review).
