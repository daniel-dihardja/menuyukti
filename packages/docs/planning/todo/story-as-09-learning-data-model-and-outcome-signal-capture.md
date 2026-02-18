# Story AS-09: Learning Data Model and Outcome Signal Capture

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Create the data model and event capture layer required for controlled outcome-based learning.

## Why This Matters
- Learning quality depends on clean recommendation-to-outcome linkage.
- Enables measurable self-improvement without unsafe shortcuts.

## Scope
- Define events for issued recommendation, user decision, execution status, and outcome deltas.
- Enforce branch/persona/time scoping and schema versioning.
- Add data quality checks for learning eligibility.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Learning events are persisted with deterministic linkage keys.
- Weak or noisy outcomes are filtered out by policy.
- Learning capture tests pass.

- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Learning event schema and storage design.
- Capture pipeline implementation.
- Validation checks for learning data quality.

