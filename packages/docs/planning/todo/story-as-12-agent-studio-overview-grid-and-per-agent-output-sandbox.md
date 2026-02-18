# Story AS-12: Agent Studio Overview Grid and Per-Agent Output Sandbox

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AI-AGENTIC-SYSTEM

## Goal
Provide a persistent Agent Studio experience where users can discover agents in an overview grid, open each agent individually, and test outputs safely.

## Why This Matters
- Improves discoverability and trust by making agents explorable and testable one by one.
- Creates a stable UX shell for iterative rollout of new agents without changing navigation patterns.

## Scope
- Keep `/agents` as an overview grid with agent cards and status labels.
- Keep per-agent detail pages as output sandboxes with explicit run/test actions.
- Show required trust/readiness metadata on each sandbox output.
- Support empty/coming-soon states without broken navigation.

## Acceptance Criteria
- Agents app integration tests for this story pass before web-app integration.
- Agent Studio grid route exists and renders active/coming-soon agent cards.
- Each released agent can be opened and tested on its dedicated detail page.
- Sandbox output includes confidence/readiness/evidence metadata where applicable.
- Dedicated E2E scenario for this story passes in CI/local gate.

## Deliverables
- Agents app integration test suite updates (pre-integration gate).
- Story-specific E2E test case(s) and execution evidence.
- Agent Studio UX contract (grid + detail sandbox behavior).
- Route and navigation updates preserving per-agent exploration flow.
