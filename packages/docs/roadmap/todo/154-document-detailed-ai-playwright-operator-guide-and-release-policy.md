# Story 154: Document detailed AI + Playwright operator guide and release policy

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 146

## Goal
Provide a detailed end-to-end guide for setting up, running, and operating autonomous AI exploratory testing.

## Why This Matters
- Without clear operating guidance, the feature becomes fragile and underused.
- Teams need explicit runbook instructions, triage policy, and release usage patterns.

## Scope
- Write detailed guide including:
  - prerequisites and env setup
  - local run commands
  - mission selection and customization
  - artifact interpretation
  - severity triage workflow
  - when to enable/disable auto-fix
  - CI schedule strategy and release gate policy
  - common failure modes and recovery steps
- Update roadmap `SPECS.md` with release status and boundaries for AI exploratory testing.

## Acceptance Criteria
- New operator can execute first autonomous run by following guide only.
- Guide explains both technical operation and product value.
- Specs/manual statements align with actual shipped behavior.

## Deliverables
- Detailed operator guide markdown + `SPECS.md` update.

## Dependencies
- Stories 147-153.
