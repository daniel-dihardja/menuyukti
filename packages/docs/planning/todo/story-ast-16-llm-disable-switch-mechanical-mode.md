# Story AST-16: LLM Disable Switch (Mechanical Mode)

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Allow disabling live LLM calls globally via runtime config/env var so the app can be tested in deterministic mechanical mode.

## Why This Matters
- Enables stable regression checks independent of provider/network/model drift.
- Gives product and QA a safe mode to verify UX, contracts, trust rendering, run history, and compare flows.

## Scope
- Add a global runtime flag (for example `AGENTS_LLM_ENABLED`).
- When disabled:
  - no live LLM/provider call is attempted
  - deterministic fallback path is used
  - trust metadata clearly signals fallback/mechanical mode
- Document behavior and local usage.

## Acceptance Criteria
- A single env/runtime switch disables LLM calls across all in-scope agents.
- Agent pages still run end-to-end with deterministic outputs and trust metadata.
- Run history and comparison views continue to function in mechanical mode.
- Agents integration tests validate disabled-mode behavior.
- Story-specific E2E validates mechanical-mode runs and visible fallback/trust signals.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- Runtime config and guard that bypasses LLM execution when disabled.
- Mechanical-mode contract/trust marker in responses.
- Integration tests for enabled vs disabled behavior.
- Story E2E suite and evidence.
