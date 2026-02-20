# Codex Improver Protocol (Pilot Only)

Use this protocol whenever PTL-07/PTL-08 feed Codex the failing artifacts from the pilot loop and consume the improved prompt candidate prior to the next iteration run. This document keeps the contract versioned, tied to the iteration artifacts, and explicitly scoped to the pilot.

## Input Contract (what the improver receives)
- `run_id` (`string`, required): copied from `iteration-summary.json`.
- `iteration` (`int`, required): the iteration number that just completed.
- `prompt_version` / `prompt_text`: the candidate that produced the failing score.
- `scoring_spec_version`, `model_id`, `provider`: metadata preserved so improver knows which spec/weights are active.
- `total_score`, `baseline_delta`, `pass_fail`, `stop_reason`: loop-level outcomes pulled from `iteration-summary.json`.
- `dimension_scores`: keyed by each dimension defined in PTL-12 (e.g., `schema_validity`, `menu_item_mention`, `premium_tone`, `cta_actionability`, `hashtag_quality`). Present because the improver must know the score for each rubric/binary dimension.
- `failed_dimensions`: derived from PTL-12 weights (score < weight) and stored in `iteration-summary.json`. This is the primary reason used to focus the next prompt revision.
- `failed_checks`: the `score.json` list of critical failures (schema, missing fields) so Codex never promotes broken JSON.
- `case_inputs` / `case_outputs`: condensed list (from `output.json`) showing what each mocked fixture received and what response it produced, helping Codex reason about concrete failing values.
- `constraints`: a short list of requirements that must survive (e.g., `["JSON payload with caption/cta/hashtags", "CTA must start with action verb", "2-4 hashtags"]`). These are derived from the scoring rubric and the prompt improvement notes.
- `candidate_history` (optional): previously tried prompt versions for this run so Codex avoids repeating already-applied edits.

### Sample Input Snippet
```json
{
  "run_id": "pilot_loop_abcdef",
  "iteration": 02,
  "prompt_version": "pilot-candidate-02",
  "prompt_text": "Prioritize JSON output with premium tone and menu-item mention.",
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
  "case_inputs": [
    {
      "case_id": "pilot-case-01",
      "input": { "menu_item": "Golden Tartine" },
      "selected_output": {
        "caption": "Elevate tonight with our chef special.",
        "cta": "Try it soon.",
        "hashtags": ["#foodie"]
      }
    }
  ],
  "constraints": [
    "must return JSON with caption, cta, hashtags",
    "CTA should start with an action verb",
    "include 2-4 hashtags prefixed with #"
  ]
}
```

## Output Contract (what Codex must return)
- `candidate_id` (`string`): a short tag (e.g., `v1-improved-2`) that the loop uses for tracking and folder naming.
- `prompt_text` (`string`): the revised prompt, typically appending additional instructions that focus on the failed dimensions.
- `rationale` (`string`): optional explanation limited to 50 words summarizing what changed (e.g., “Mentioned the menu_item and CTA pattern after the first case failed because the caption no longer named Golden Tartine.”).
- `constraints_preserved`: boolean or list confirming the constraints above remain intact.
- `safety_notes` (optional): any reason to skip the candidate (e.g., “contains forbidden phrase”), which the loop should treat as a no-op and keep the previous prompt.

### Sample Output Snippet
```json
{
  "candidate_id": "v1-improved-3",
  "prompt_text": "Return premium JSON with caption/cta/hashtags. Mention menu_item exactly and start CTA with action verbs 'Reserve' or 'Order'. Include 2-4 hashtags that begin with '#'.",
  "rationale": "Preserved schema while explicitly calling out CTA verbs and menu_item hyperlink.",
  "constraints_preserved": [
    "JSON schema",
    "CTA starts with action verb",
    "2-4 hashtags"
  ]
}
```

## Guardrails
- **Pilot-only scope:** avoid adding new fields, altering `agent_id`, or emitting general production guidance. Keep the change limited to the iteration run described in the input.
- **Forbidden edits:** Codex must not drop required fields, include disallowed phrases (`cheap`, `fast-food`), or modify dataset/agent identifiers.
- **Fallback path:** if Codex returns `null` or fails constraints, the loop should log `improver_unavailable` and retry the existing prompt (ensuring no commit until a valid candidate is produced).
- **Traceability:** include `candidate_id` in `iteration-summary.json` so PTL-08 can persist the new prompt and PTL-09 can trace guardrail violations back to a candidate.
- **Versioning:** treat this doc as the definitive pilot contract; bump a version tag in the file header if future pilots change the fields.

Link this protocol with `packages/docs/planning/blueprints/iteration-artifacts-samples.md` so everyone can correlate the failing dimension list with the input fields above.
