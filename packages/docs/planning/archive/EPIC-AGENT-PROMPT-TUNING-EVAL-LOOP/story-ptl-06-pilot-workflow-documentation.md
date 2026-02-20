# Story PTL-06: Pilot Workflow Documentation

## Story Metadata
- Created Date: 2026-02-20
- Status: `complete`
- Completed Date: 2026-02-20
- Parent: EPIC-AGENT-PROMPT-TUNING-EVAL-LOOP
- Story Points: `3`

## Goal
Publish practical documentation for operating, debugging, and extending the pilot prompt-improvement workflow.

## Why This Matters
- Reduces onboarding friction and operational ambiguity.
- Makes the pilot reproducible without relying on tribal knowledge.

## Scope
- Write operator runbook for end-to-end execution.
- Document scoring spec authoring rules and examples.
- Document artifact interpretation and troubleshooting guide.
- Include "Onboard Next Agent" checklist for scale-out.
- Document mocked-fixture-only data policy and how to enforce it.

## Acceptance Criteria
- Documentation covers setup, commands, expected outputs, and failure paths.
- Scoring spec docs distinguish binary vs rubric dimensions with examples.
- Troubleshooting section includes max-iteration and unstable-score scenarios.
- Onboarding checklist enables repeating workflow on a second agent.
- Test impact is explicitly marked as N/A if no code behavior changes are introduced.

## Deliverables
- Pilot workflow runbook document.
- Scoring spec guide document.
- Artifact interpretation and troubleshooting document.
- "Onboard Next Agent" checklist.

## Implementation Notes
- Added pilot workflow runbook covering:
  - baseline and loop commands
  - scoring-spec authoring guidance
  - artifact interpretation
  - troubleshooting
  - onboarding checklist
  - File: `packages/docs/contracts/AGENT_PROMPT_TUNING_PILOT_WORKFLOW_V1.md`
- Updated agents README to reference workflow docs:
  - `apps/agents/README.md`

## Test Evidence
- Test impact: N/A (documentation-only story)
