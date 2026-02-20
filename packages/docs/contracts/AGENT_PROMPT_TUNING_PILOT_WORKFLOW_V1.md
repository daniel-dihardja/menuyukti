# Agent Prompt Tuning Pilot Workflow v1

## Purpose
Operational runbook for the single-agent prompt-tuning pilot (`marketer-strategist`) using mocked fixtures only.

## Scope
- Baseline scoring run
- Automatic prompt improvement loop
- Prompt freeze and readiness reporting
- Scale-out checklist for onboarding the next agent

## Data Policy
- Inputs must come only from:
  - `apps/agents/eval-fixtures/prompt-tuning-pilot/marketer-strategist-caption-dataset-v1.json`
- Live DB/API input is out of scope for this workflow.

## Artifacts
- Dataset:
  - `apps/agents/eval-fixtures/prompt-tuning-pilot/marketer-strategist-caption-dataset-v1.json`
- Scoring spec:
  - `apps/agents/eval-fixtures/prompt-tuning-pilot/marketer-strategist-caption-scoring-spec-v1.json`
- Baseline/loop report:
  - `apps/agents/eval-artifacts/pilot/prompt-tuning-pilot-latest.json`
- Freeze map:
  - `apps/agents/prompts/PILOT_PROMPT_VERSION_FREEZE_V1.json`
- Readiness report:
  - `apps/agents/eval-artifacts/pilot/readiness-report.md`

## Runbook

### 1. Baseline

```bash
uv run --project apps/agents python apps/agents/scripts/run_prompt_tuning_pilot.py --mode baseline
```

Expected:
- Report JSON written.
- `mode` is `baseline`.
- `selected_candidate` is `pilot-v1`.

### 2. Improvement Loop

```bash
uv run --project apps/agents python apps/agents/scripts/run_prompt_tuning_pilot.py \
  --mode loop \
  --max-iterations 5 \
  --reruns-per-candidate 3 \
  --write-freeze-map \
  --write-readiness-report \
  --fail-on-unapproved
```

Expected:
- Loop report JSON written.
- `selected_candidate` populated on pass.
- Freeze map updated on pass.
- Readiness report written.

## Scoring Spec Authoring Guide

Dimensions must declare:
- `id`
- `type`: `binary` or `rubric`
- `weight`
- `scoring_rule`

Guidance:
- Put hard contract checks in `binary` dimensions.
- Put style/readability checks in `rubric` dimensions.
- Keep total weights at `100`.
- Keep threshold and critical-fail rules explicit and versioned.

## Artifact Interpretation

Use these fields from loop report:
- `baseline.total_score`: quality starting point
- `iterations[].total_score`: candidate quality trend
- `iterations[].baseline_delta`: improvement amount
- `iterations[].regression_guard`: critical dimensions preserved
- `selected_candidate`: approved prompt candidate (if any)
- `stop_reason`:
  - `stop_condition_met`
  - `max_iterations_reached`

## Troubleshooting

### Max iterations reached
- Symptom: `stop_reason=max_iterations_reached`, `selected_candidate=null`
- Actions:
  - Check failed dimensions from `average_dimensions`.
  - Tighten improvement instructions for the failed dimensions.
  - Re-run loop with same fixtures/spec to preserve comparability.

### Unstable scores
- Symptom: unexpected score variation between runs
- Actions:
  - Keep deterministic policy fixed (`temperature=0`, `top_p=1`, fixed provider/model).
  - Verify fixture and scoring spec versions are unchanged.
  - Keep `reruns_per_candidate=3` and use median score.

### Freeze map not written
- Symptom: CLI prints no approved candidate.
- Actions:
  - Inspect `pass_fail`, `baseline_delta`, and `regression_guard`.
  - Confirm threshold and minimum-improvement conditions are met.

## Onboard Next Agent Checklist
- [ ] Define new mocked fixture dataset with version id.
- [ ] Define new scoring spec with version id and threshold policy.
- [ ] Add baseline prompt artifact for the new agent.
- [ ] Reuse pilot runner pattern (baseline + loop + freeze + readiness).
- [ ] Add unit tests for dataset/spec/loop behavior.
- [ ] Validate pass criteria and archive evidence before rollout.
