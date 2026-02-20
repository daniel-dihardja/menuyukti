# Agent Prompt Tuning Test Agent v1

## Agent ID
`prompt-tuning-test-agent`

## Purpose
Pilot-only agent used as the tuning target for prompt-iteration experiments.

The task is intentionally designed to support a wide scoring range:
- strict contract checks (binary)
- decision correctness checks (binary/partial)
- language quality checks (rubric)

## Task Definition

Given mocked restaurant campaign context, produce a structured "promo brief" that includes:
- a concise campaign headline
- a primary recommendation
- one fallback recommendation
- justification tied to provided signals
- a constrained hashtag set

## Input Contract (v1)

Required fields:
- `contract_version: "v1"`
- `scenario_id: string`
- `restaurant_name: string`
- `menu_item: string`
- `target_audience: string`
- `tone: "premium" | "friendly" | "playful"`
- `objective: "traffic" | "margin" | "awareness"`
- `daypart: "morning" | "lunch" | "afternoon" | "evening"`
- `price_band: "budget" | "mid" | "premium"`
- `inventory_pressure: "low" | "medium" | "high"`
- `brand_guardrails: string[]`
- `forbidden_phrases: string[]`
- `must_include_terms: string[]`
- `candidate_actions: string[]`
- `evidence_facts: string[]`

## Output Contract (v1)

Required fields:
- `headline: string`
- `primary_action: string`
- `fallback_action: string`
- `audience_hook: string`
- `justification: string`
- `risk_note: string`
- `hashtags: string[]`

Output constraints:
- `primary_action` and `fallback_action` must be chosen from input `candidate_actions`
- `headline` must mention `menu_item`
- `hashtags` length must be `2..4`
- `justification` must reference at least one `evidence_facts` item
- output must not include any `forbidden_phrases`

## Why This Shape Is Good For Scoring

Binary dimensions (easy deterministic pass/fail):
- required field presence
- action-in-allowed-set
- menu-item mention
- forbidden phrase exclusion
- hashtag count bounds

Rubric dimensions (quality gradient):
- tone alignment to `tone`
- usefulness/actionability of `primary_action`
- clarity/specificity of `justification`
- readability and concision of `headline`

This combination gives broad score variance and clear improvement targets per iteration.

## Pilot Scope Boundary

- This agent is pilot-only and must not replace existing production agents.
- Inputs are mocked fixtures only for tuning-loop scoring.
