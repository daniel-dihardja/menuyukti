# Story AS-00: Legacy Audience/Tone Agent Decommission and Route Cleanup

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Remove legacy audience/tone agent surfaces safely before implementing the new core agent architecture.

## Why This Matters
- Prevents architecture drift and duplicate agent paradigms.
- Reduces migration risk for new strategist/profit agents.

## Scope
- Remove/hide legacy audience/tone entry points.
- Deprecate legacy audience/tone-only contracts and routes.
- Preserve scheduler post-draft compatibility behavior.
- Add regression checks for marketer and analyst workflows.

## Acceptance Criteria
- Legacy audience/tone entry points are removed from product navigation and API contract surface.
- Scheduler and draft workflows continue to function without regressions.
- E2E regression checks for core workflows pass.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Story-specific E2E test case(s) and execution evidence.
- Route and contract cleanup changes.
- Compatibility notes for removed legacy paths.
- Regression test updates and passing evidence.

