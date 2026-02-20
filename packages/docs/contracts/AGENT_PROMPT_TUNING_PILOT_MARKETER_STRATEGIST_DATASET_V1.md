# Agent Prompt Tuning Pilot Dataset v1 (Marketer Strategist)

## Purpose
Define the pilot contract and fixed mocked dataset used for `EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP` story `PTL-01`.

## Data Policy
- `mocked-fixtures-only`
- No live DB/API input is allowed for pilot scoring runs.

## Dataset Artifact
- `apps/agents/pilot/prompt-tuning/fixtures/marketer-strategist-caption-dataset-v1.json`

## Dataset Version
- `pilot-ms-caption-v1`

## Agent
- `marketer-strategist`

## Input Contract (Pilot)
- `restaurant_name: string`
- `menu_item: string`
- `target_audience: string`
- `tone: "premium"` (pilot-locked tone)

## Output Contract (Pilot)
- `caption: string`
- `cta: string`
- `hashtags: string[]`

## Case Coverage
- Minimum required cases in v1:
  - `normal` case: standard menu promotion
  - `normal` case: beverage-oriented promotion
  - `edge` case: less common menu phrase to validate exact mention handling

## Change Policy
- Any change to fixture content requires bumping `dataset_version`.
- Scoring runs must record `dataset_version`.
