# Agent Prompt Tuning Pilot Workflow v1

## Purpose
Operational runbook for the single-agent prompt-tuning pilot (`marketer-strategist`) using mocked fixtures only.

## Scope
- Agent invocation runtime
- Codex scoring + decision loop
- Codex prompt improvement loop
- Prompt freeze and readiness reporting
- Scale-out checklist for onboarding the next agent

## Data Policy
- Inputs must come only from:
  - `apps/agents/pilot/prompt-tuning/fixtures/marketer-strategist-caption-dataset-v1.json`
- Live DB/API input is out of scope for this workflow.

## Artifacts
- Dataset:
  - `apps/agents/pilot/prompt-tuning/fixtures/marketer-strategist-caption-dataset-v1.json`
- Scoring spec:
  - `apps/agents/pilot/prompt-tuning/fixtures/marketer-strategist-caption-scoring-spec-v1.json`
- Baseline/loop report:
  - `apps/agents/pilot/prompt-tuning/outputs/prompt-tuning-pilot-latest.json`
- Freeze map:
  - `apps/agents/pilot/prompt-tuning/outputs/PILOT_PROMPT_VERSION_FREEZE_V1.json`
- Readiness report:
  - `apps/agents/pilot/prompt-tuning/outputs/readiness-report.md`
- Final prompt:
  - `apps/agents/pilot/prompt-tuning/outputs/final-prompt.txt`

## Runbook

### 1. Runtime Execution

```bash
uv run --project apps/agents python apps/agents/pilot/prompt-tuning/run_prompt_tuning_pilot.py \
  --mode loop \
  --write-freeze-map \
  --write-readiness-report \
  --write-final-prompt \
  --fail-on-unapproved
```

Expected:
- Runtime report JSON written.
- Freeze/readiness/final-prompt artifacts written on pass.

### 2. Codex-Orchestrated Iteration Loop

Per iteration:
1. Agent invocation writes `output.json`.
2. Codex reads `output.json` and writes `score.json`.
3. Codex writes `iteration-summary.json`.
4. If below threshold, Codex revises prompt and triggers next iteration.
5. If above threshold, Codex stops and freezes selected prompt.

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

Use these fields from artifacts:
- `output.json`: raw generated output and runtime metadata
- `score.json`: dimension scores, failed checks, threshold result
- `iteration-summary.json`: iteration decision and next-step state
- `prompt-tuning-pilot-latest.json`: aggregate run summary

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
