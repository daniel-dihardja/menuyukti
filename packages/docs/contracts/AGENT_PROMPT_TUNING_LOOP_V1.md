# Agent Prompt Tuning Loop v1

## Purpose
Define the isolated per-agent prompt tuning loop used in Phase 1 to select approved prompt versions without introducing multi-agent orchestration.

## Scope
- Runs one or more target agents in isolation.
- Evaluates all known prompt versions for each target agent.
- Uses fixed mocked required inputs through the existing evaluation harness.
- Produces approved prompt-version map and tuning evidence report.

## Runtime Interfaces
- Agents API endpoint:
  - `POST /agents/evaluation/prompt-tuning`
- Web proxy endpoint:
  - `GET /api/agents/evaluation/prompt-tuning`
- CLI:
  - `python apps/agents/scripts/run_prompt_tuning_loop.py`

## Output Contract (summary)
- `contract_version`
- `tuning_loop_version`
- `mode`
- `agents[]` with:
  - `agent_id`
  - `evaluations[]`:
    - `prompt_version`
    - `release_gate_passed`
    - `pass_rate`
    - `failed`
    - `avg_quality_score`
  - `approved_prompt_version`
- `approved_prompt_versions` map

## Selection Rule
Prompt version selection priority per agent:
1. `release_gate_passed=true`
2. highest `pass_rate`
3. highest `avg_quality_score`

## Freeze Map
Approved prompt versions are stored in:
- `apps/agents/prompts/PROMPT_VERSION_FREEZE_V1.json`

Runtime default prompt resolution:
- frozen version from freeze map
- then env override via `AGENTS_PROMPT_VERSION_<AGENT_ID_NORMALIZED>` when provided

## Evidence Artifacts
Default tuning report output path:
- `apps/agents/eval-artifacts/prompt-tuning-loop-latest.json`
