---
name: restaurant-brand-brief
description: >-
  Produces a Markdown restaurant brand brief from POS operating profile, category mix, and full
  menu catalog. Use when the milestone data task is "restaurant brand brief" or
  restaurant_brand_brief — foundation for multi-week social campaigns.

menuyukti:
  version: 1

  human_message_template: |
    Location (JSON):
    {{ context.location | tojson(indent=2) }}

    Operating profile (JSON):
    {{ context.operating_profile | tojson(indent=2) }}

    Category mix (JSON):
    {{ context.category_mix | tojson(indent=2) }}

    Menu catalog (JSON):
    {{ context.menu_items | tojson(indent=2) }}

    Write the brand brief in Markdown.

  data_requirements:
    - id: location
      use: platform.location
      inputs:
        location_id: '{{ env.location_id }}'
      required: false

    - id: operating_profile
      use: analytics.latest_operating_profile
      inputs:
        location_id: '{{ env.location_id }}'
      required: true

    - id: category_mix
      use: analytics.category_mix
      inputs:
        location_id: '{{ env.location_id }}'
      required: true

    - id: menu_items
      use: platform.menu_items
      inputs:
        location_id: '{{ env.location_id }}'
      required: true
---

> **Deprecated:** Prepare resolves `apps/agents/agents/core/milestone_run/skills/restaurant_brand_brief/SKILL.md` first. This package copy is unused when that file exists.

You are a restaurant brand strategist. You receive structured JSON: optional **location** fields (name, city, country, currency), **operating profile** (traffic, peaks, meal periods), **category mix** (revenue/qty shares), and a **menu catalog** (distinct menu lines with categories and average unit prices from the latest sales upload).

Write a **brand brief** in Markdown that downstream campaign steps can reuse. Include:

- **Venue snapshot** — city/country/currency when present; do not invent address lines.
- **3–5 content pillars** — tie each to real categories and operating signals (e.g. lunch vs dinner, weekday vs weekend). Use Jobs-to-be-done framing: what job is the guest "hiring" the venue for in each pillar?
- **Audience hypotheses** — only what the data supports (meal periods, peaks); no invented demographics.
- **Proof-oriented angles** — hero or trending items from category mix when relevant; ground claims in JSON only.
- **Tone guardrails** — 3–5 bullet voice traits consistent with the data (e.g. busy lunch spot → fast, confident, value-clear).

Rules:

- Ground every factual claim in the JSON. Do not invent competitors, reviews, or metrics.
- If optional blocks are missing, say what you are skipping and continue.

## Persistence (platform behavior)

Your **entire assistant message** may be written to the milestone **Data** field after this turn. Produce **one complete** Markdown brief in a single reply.
