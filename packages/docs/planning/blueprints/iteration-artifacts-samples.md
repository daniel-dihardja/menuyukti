# Iteration Artifact Samples

Documenting trimmed-but-realistic artifact payloads helps everyone see how Codex scoring and loop decisions fit together.

## Sample Run Path
- `apps/agents/pilot/prompt-tuning/outputs/runs/2026-02-20T12-00-00Z/iter-01/`
- Each iteration folder always contains:
  - `output.json` (agent output + metadata)
  - `score.json` (Codex scoring matrix results)
  - `iteration-summary.json` (loop-level decision fact sheet)

## Sample `output.json`
```json
{
  "run_id": "pilot-20260220-01",
  "iteration": 1,
  "prompt_version": "v1",
  "prompt_text": "Instrument the prompt with JSON output requirements and premium markers.",
  "agent_id": "marketer-strategist",
  "cases": [
    {
      "case_id": "pilot-case-01",
      "input": {
        "restaurant_name": "Luminous Brunch Atelier",
        "menu_item": "Golden Tartine"
      },
      "outputs": [
        {
          "caption": "Elevate tonight with Golden Tartine at Luminous Brunch Atelier.",
          "cta": "Order now for tonight's seating.",
          "hashtags": ["#PremiumDining", "#GoldenTartine", "#RestaurantFinds"]
        }
      ],
      "selected_output": {
        "caption": "Elevate tonight with Golden Tartine at Luminous Brunch Atelier.",
        "cta": "Order now for tonight's seating.",
        "hashtags": ["#PremiumDining", "#GoldenTartine", "#RestaurantFinds"]
      },
      "scores": {
        "dimensions": {
          "schema_validity": 20,
          "menu_item_mention": 25,
          "premium_tone": 20,
          "cta_actionability": 20,
          "hashtag_quality": 15
        },
        "critical_failures": [],
        "total_score": 100,
        "pass_fail": true
      }
    }
  ]
}
```
The `cases` array pairs each mocked fixture with the recorded outputs, the selected output for scoring, and the per-case dimensions so the loop can trace back each scoring decision.

## Happy Path `score.json`
```json
{
  "run_id": "pilot-20260220-01",
  "prompt_version": "v1",
  "iteration": 1,
  "scoring_matrix_version": "codex-scoring-v1",
  "threshold": 80,
  "total_score": 85,
  "pass_fail": true,
  "dimension_scores": {
    "schema_validity": 20,
    "menu_item_mention": 25,
    "premium_tone": 20,
    "cta_actionability": 20,
    "hashtag_quality": 0
  },
  "baseline_delta": 5,
  "failed_checks": [],
  "stop_reason": "pass_threshold_met"
}
```
The `dimension_scores` map back to the scoring matrix defined in PTL-12 so downstream steps can explain each score component.

## Failing Path `iteration-summary.json`
```json
{
  "run_id": "pilot-20260220-01",
  "iteration": 2,
  "prompt_version": "v1-improved-1",
  "output_path": "apps/agents/pilot/prompt-tuning/outputs/runs/pilot-20260220-01/iter-02/output.json",
  "score_path": "apps/agents/pilot/prompt-tuning/outputs/runs/pilot-20260220-01/iter-02/score.json",
  "total_score": 62,
  "pass_fail": false,
  "baseline_delta": -3,
  "stop_reason": "below_threshold",
  "next_action": "improve",
  "failed_dimensions": ["menu_item_mention", "cta_actionability"],
  "failed_checks": ["missing_required_field"],
  "improver": {
    "failed_dimensions": ["menu_item_mention", "cta_actionability"],
    "failed_checks": ["missing_required_field"],
    "baseline_delta": -3
  }
}
```
This file shows how the loop records the failing dimensions, baseline impact, and prompt candidate that gets sent to the improver story (PTL-07/PTL-08).

## Notes
- Keep these samples synchronized with the real artifacts used by the pilot loop.
- Link this blueprint from PTL-08 and PTL-09 documentation so implementers can see both happy and fail states when validating guardrails.

## Improver Artifacts
- Each iteration folder also records the Codex improver payloads that feed PTL-08/PTL-09.
- `improver-input.json` follows the pilot contract (run, iteration, failed dimensions/checks, case inputs, constraint list) and shows what Codex received before crafting a new prompt.
- `improver-output.json` stores the candidate ID, prompt text, rationale, preserved constraints, and safety notes when available.

### Sample `improver-input.json`
```json
{
  "run_id": "pilot_loop_abcdef",
  "iteration": 2,
  "prompt_version": "pilot-candidate-02",
  "prompt_text": "Return premium JSON with caption/cta/hashtags.",
  "total_score": 62,
  "baseline_delta": -3,
  "failed_dimensions": ["menu_item_mention", "cta_actionability"],
  "failed_checks": ["missing_required_field"],
  "dimension_scores": {
    "schema_validity": 18,
    "menu_item_mention": 0,
    "premium_tone": 12,
    "cta_actionability": 6,
    "hashtag_quality": 12
  },
  "constraints": [
    "Return strict JSON with keys caption, cta, hashtags.",
    "CTA must start with an action verb.",
    "Include 2-4 relevant hashtags that each begin with '#'."
  ],
  "case_inputs": [
    {
      "case_id": "pilot-case-01",
      "input": {
        "restaurant_name": "Luminous Brunch Atelier",
        "menu_item": "Golden Tartine"
      },
      "selected_output": {
        "caption": "Elevate tonight with our chef special.",
        "cta": "Try it soon.",
        "hashtags": ["#foodie"]
      },
      "scores": {
        "dimensions": {
          "schema_validity": 18,
          "menu_item_mention": 0,
          "premium_tone": 12,
          "cta_actionability": 6,
          "hashtag_quality": 12
        },
        "critical_failures": ["missing_required_field"],
        "total_score": 62,
        "pass_fail": false
      }
    }
  ]
}
```

### Sample `improver-output.json`
```json
{
  "candidate_id": "v1-improved-02",
  "prompt_text": "Return premium JSON with caption/cta/hashtags. Mention the menu_item string exactly in the next caption. Start the CTA with an action verb (Reserve/Order/Book). Include 2-4 relevant hashtags that each begin with '#'.",
  "rationale": "Mentioned the menu_item and CTA verbs after menu_item_mention and cta_actionability failed.",
  "constraints_preserved": [
    "Return strict JSON with keys caption, cta, hashtags.",
    "CTA must start with an action verb.",
    "Include 2-4 relevant hashtags that each begin with '#'."
  ],
  "safety_notes": []
}
```

### Guardrail Outputs
- `iteration-summary.json` records `improver_failure_reasons` (list) when Codex output fails guardrails and includes `improver.guardrail_reasons` within the improver object so operators can quickly see why the candidate was rejected.
