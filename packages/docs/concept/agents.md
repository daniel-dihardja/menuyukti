# Agent Roadmap

This document describes the agent roadmap for Menuyukti.

## Agent Data Contract (v1)

This contract defines how agents exchange structured data.

### Core Inputs (shared across agents)

```json
{
  "restaurant": {
    "name": "string",
    "location": "string",
    "cuisine": "string",
    "price_tier": "low|mid|high",
    "brand_notes": "string|null"
  },
  "analytics": {
    "period_start": "YYYY-MM-DD",
    "period_end": "YYYY-MM-DD",
    "top_items": [
      {"menu": "string", "quantity": "number", "category": "string"}
    ],
    "peak_hours": [10, 12, 19],
    "weekday_bias": "weekday|weekend|balanced"
  },
  "action_candidates": [
    {
      "menu": "string",
      "action": "promote|consider|do_not_promote",
      "priority": "critical|high|medium|low",
      "recommended_post_time": "HH:MM:SS",
      "reason": "string",
      "expected_behavior": "string"
    }
  ]
}
```

### Audience Agent Output

```json
{
  "audience_profile": {
    "primary_segment": "string",
    "secondary_segment": "string|null",
    "age_range": "string",
    "lifestyle": ["string"],
    "price_sensitivity": "low|mid|high",
    "motivations": ["convenience", "taste", "value", "social"],
    "occasions": ["weekday lunch", "after work", "weekend treat"]
  }
}
```

### Brand Voice Agent Output

```json
{
  "brand_voice": {
    "tone": ["friendly", "confident", "warm"],
    "style": ["short sentences", "local slang", "light emojis?"],
    "do_use": ["signature item names", "local references"],
    "avoid": ["hard sell", "discount jargon"],
    "cta_templates": [
      "Drop by for {menu}",
      "Try {menu} today",
      "Your next favorite: {menu}"
    ],
    "hashtags": ["#cityeats", "#coffeelover"]
  }
}
```

### Content Agent Input

```json
{
  "candidate": {
    "menu": "string",
    "action": "promote|consider|do_not_promote",
    "priority": "critical|high|medium|low",
    "recommended_post_time": "HH:MM:SS",
    "reason": "string",
    "expected_behavior": "string"
  },
  "audience_profile": { },
  "brand_voice": { },
  "constraints": {
    "max_length": 2200,
    "language": "id|en",
    "include_hashtags": true
  }
}
```

### Content Agent Output

```json
{
  "caption": "string",
  "hashtags": ["#..."],
  "cta": "string",
  "visual_brief": "string",
  "posting_time": "HH:MM:SS"
}
```

Notes:
- Agents should be pure functions of their inputs.
- Store outputs in `insightsJson` for traceability.
- Version this contract (e.g., `contract_version: "v1"`).

## Phase 1 (Instagram‑Only)

1. **Content Agent**
   Generates Instagram captions, hashtags, CTA, and a visual brief from a decision candidate.

2. **Calendar Agent**
   Turns the weekly schedule into a coherent content plan (themes, spacing, and variety).

3. **Brand Voice Agent**
   Enforces tone, vocabulary, and do/don’t rules across all outputs.

4. **Operator Brief Agent**
   Summarizes “why these posts” in plain language for staff/owners.

5. **Performance Analyst Agent**
   Reviews post outcomes (engagement, sales lift) and suggests adjustments.

## Phase 2 (Promos & Combos)

6. **Promo Ideation Agent**
   Suggests limited‑time offers based on growth‑lever items.

7. **Combo Builder Agent**
   Proposes bundles using traffic drivers + growth levers.

8. **Pricing Guardrail Agent**
   Checks margin impact and flags risky discounts.

---

Notes:
- Phase 1 is designed for low operational risk and fast iteration.
- Phase 2 adds pricing and operational complexity, so it is optional and staged.
