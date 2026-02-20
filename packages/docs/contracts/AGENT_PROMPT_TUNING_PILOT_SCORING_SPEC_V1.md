# Agent Prompt Tuning Pilot Scoring Spec v1

## Purpose
Define the deterministic scoring policy for story `PTL-02` in `EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP`.

## Scoring Spec Artifact
- `apps/agents/pilot/prompt-tuning/fixtures/marketer-strategist-caption-scoring-spec-v1.json`

## Version
- `scoring_spec_version: pilot-ms-caption-scoring-v1`

## Scope
- Agent: `marketer-strategist`
- Task: `instagram_caption_generation`
- Dataset version lock: `pilot-ms-caption-v1`
- Data policy: `mocked-fixtures-only`

## Key Rules
- Pass threshold: `>= 80`
- Critical fail checks:
  - `invalid_json`
  - `missing_required_field`
- Baseline improvement minimum: `+8 vs v1 baseline`
- Regression guard: critical dimensions must not drop below baseline
- Iteration max: `5`

## Determinism Policy
- Fixed model/provider per pilot run.
- Temperature `0`, top_p `1`.
- `3` reruns per candidate, median total score used as final candidate score.

## Change Policy
- Any scoring rule, threshold, or dimension weight change requires a new `scoring_spec_version`.
- Pilot loop artifacts must include `scoring_spec_version` and `dataset_version`.
