# Story 156: Autonomous LLM planner foundation epic

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Add the first implementation layer for a true autonomous AI tester: provider SDK setup, planner contracts, planner service, and perception context extraction.

## Why This Matters
- Existing mission runner is scripted execution.
- Autonomous exploration requires LLM-driven action planning with strict safety contracts.

## Scope
- Implement steps 1-4:
  - SDK/provider install + env wiring
  - planner input/output contracts
  - planner module using structured output
  - perception payload builder from Playwright page context

## Acceptance Criteria
- Child stories 157-160 are completed.
- Planner can generate a typed next action from mission/context input.
- Perception payload includes enough context for dynamic UI navigation.

## Deliverables
- Parent epic for autonomous planner foundation.
