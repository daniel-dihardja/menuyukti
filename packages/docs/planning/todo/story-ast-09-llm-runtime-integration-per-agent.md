# Story AST-09: LLM Runtime Integration per Agent

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-AGENT-STUDIO-EXPLORATION-LAB

## Goal
Implement LLM execution path for each Phase 1 agent with provider abstraction and runtime safeguards.

## Why This Matters
- Moves agents from deterministic placeholders to real AI behavior.
- Creates foundation for isolated prompt tuning.

## Scope
- Add provider abstraction layer and per-agent runtime config.
- Integrate LLM invocation for each Phase 1 agent endpoint.
- Enforce timeout/retry and error classification.
- Keep CI integration tests deterministic by mocking required inputs and provider responses.
- Expose a runtime switch/profile so the same endpoints can execute with live provider in non-mocked runs.
- Enforce structured response envelopes and typed domain payloads for all LLM path outcomes.

## Acceptance Criteria
- Each Phase 1 agent endpoint can execute via LLM path.
- LLM invocation includes prompt version and model id in run metadata.
- Agents app integration tests mock required inputs and provider responses per agent (required CI gate).
- Live-provider execution path is available for Phase 1 agents and can be invoked by dedicated evaluation runs.
- LLM output is mapped into structured contract fields; no endpoint returns free-form-only text payloads.
- Story-specific E2E validates LLM-backed run availability from Agent Studio.

- Unit tests are added/updated when isolated logic is introduced; if not applicable, include an explicit rationale.

## Deliverables
- Unit-test updates (where applicable) or explicit N/A rationale.
- LLM runtime integration in agents app.
- Per-agent runtime configuration.
- Mocked-input integration tests per Phase 1 agent.
- Story E2E suite and evidence.
