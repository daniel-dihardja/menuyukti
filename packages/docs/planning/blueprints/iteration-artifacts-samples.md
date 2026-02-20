# Iteration Artifact Samples

Documenting trimmed-but-realistic artifact payloads helps everyone see how Codex scoring and loop decisions fit together.

## Sample Run Path
- `apps/agents/pilot/prompt-tuning/outputs/runs/2026-02-20T12-00-00Z/iter-01/`
- Each iteration folder always contains:
  - `output.json` (agent output + metadata)
  - `score.json` (Codex scoring matrix results)
  - `iteration-summary.json` (loop-level decision fact sheet)

## Happy Path `score.json`
```json
{
  "run_id": "pilot-20260220-01",
  "prompt_version": "v1",
  "total_score": 85,
  "pass_fail": "pass",
  "dimension_scores": {
    "schema_validity": 20,
    "menu_item_mention": 25,
    "premium_tone": 20,
    "cta_actionability": 20,
    "hashtag_quality": 0
  },
  "baseline_delta": "+5",
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
  "total_score": 62,
  "pass_fail": "fail",
  "failed_dimensions": ["menu_item_mention", "cta_actionability"],
  "baseline_delta": "-3",
  "stop_reason": "below_threshold",
  "improver": {
    "input_summary": "menu_item and CTA missing required phrasing",
    "output_candidate": "v1-improved-2"
  }
}
```
This file shows how the loop records the failing dimensions, baseline impact, and prompt candidate that gets sent to the improver story (PTL-07/PTL-08).

## Notes
- Keep these samples synchronized with the real artifacts used by the pilot loop.
- Link this blueprint from PTL-08 and PTL-09 documentation so implementers can see both happy and fail states when validating guardrails.
