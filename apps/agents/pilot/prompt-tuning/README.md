# Prompt Tuning Pilot (Marketer Strategist)

This directory contains a fully isolated pilot workflow for Codex-orchestrated prompt tuning using mocked fixtures only.

## Purpose

The pilot proves a repeatable tuning loop before applying the same workflow to more agents.

The loop objective is:
- start from a baseline prompt
- invoke the test agent with mocked fixtures
- write per-iteration output artifact files
- have Codex score outputs against the locked scoring matrix
- have Codex produce the next prompt candidate when below threshold
- stop when pass criteria are met
- persist approved prompt decision and final prompt text

## Data Policy

- Inputs are fixture-only.
- No live DB/API input is allowed in this workflow.
- Determinism is enforced through fixed mocked fixtures and policy constraints in the scoring spec.

## Directory Layout

- `fixtures/`
  - `marketer-strategist-caption-dataset-v1.json`
  - `marketer-strategist-caption-scoring-spec-v1.json`
- `prompts/`
  - `pilot-v1.txt` (starting baseline prompt)
- `outputs/`
  - `prompt-tuning-pilot-latest.json` (full baseline+iteration report)
  - `PILOT_PROMPT_VERSION_FREEZE_V1.json` (selected prompt version map)
  - `readiness-report.md` (human-readable summary/checklist)
  - `final-prompt.txt` (selected final prompt text)
- `run_prompt_tuning_pilot.py`
  - CLI entrypoint for pilot runtime execution and artifact writing

## Workflow Steps

1. Load fixed dataset + scoring spec from `fixtures/`.
2. Invoke test agent with current prompt and mocked case input.
3. Write per-iteration `output.json`.
4. Codex reads `output.json` and writes `score.json` using scoring matrix.
5. Codex decides pass/fail and writes `iteration-summary.json`.
6. If below threshold, Codex writes revised prompt candidate and repeats.
7. If above threshold, Codex freezes prompt and writes final report artifacts.

## Run Commands

Pilot runtime execution:

```bash
uv run --project apps/agents python apps/agents/pilot/prompt-tuning/run_prompt_tuning_pilot.py \
  --mode loop \
  --write-freeze-map \
  --write-readiness-report \
  --write-final-prompt \
  --fail-on-unapproved
```

Codex then evaluates and iterates using artifact files for each iteration.

## Scoring Approach

For each case:
- output is validated against required output shape
- each dimension gets points based on scoring matrix rules
- critical failures (`invalid_json`, `missing_required_field`) block pass

## Iteration Output Shape

Per iteration, use:
- `output.json`: raw agent output + runtime metadata
- `score.json`: Codex-applied scoring result
- `iteration-summary.json`: pass/fail decision, stop flags, next-step decision

Aggregate run output:
- `outputs/prompt-tuning-pilot-latest.json`

## Final Prompt Inspection

The selected prompt text is written to:

- `outputs/final-prompt.txt`

This is the fastest artifact to review when checking what instructions actually passed the gate.

## Troubleshooting

If loop fails with max iterations:
- inspect `iterations[].average_dimensions`
- identify lowest-scoring dimensions
- strengthen those constraints in baseline prompt
- rerun with same fixture/spec versions

If freeze map/final prompt not written:
- candidate did not pass all stop conditions
- check `pass_fail`, `selected_candidate`, and `stop_reason`

If results look unstable:
- confirm fixture and spec versions did not change
- verify the same scoring matrix was applied for each iteration
