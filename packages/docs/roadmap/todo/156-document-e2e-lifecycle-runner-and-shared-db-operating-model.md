# Story 156: Document E2E Lifecycle Runner and Shared-DB Operating Model

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 151

## Goal
Document how to run the full E2E lifecycle workflow safely with the current shared DB and how to troubleshoot common failures.

## Why This Matters
- Makes execution consistent across contributors.
- Reduces accidental DB misuse during E2E runs.
- Creates a clear transition path to future isolated E2E DB/schema.

## Scope
- Add step-by-step guide to manual/roadmap docs.
- Document required environment variables and guardrail behavior.
- Document expected outputs, failure modes, and recovery steps.

## Acceptance Criteria
- Documentation includes a copy-paste command sequence for full runs.
- Documentation includes explicit warnings for shared-DB use.
- Documentation includes troubleshooting for service boot and DB lifecycle failures.

## Deliverables
- Manual update section for E2E lifecycle usage.
- Roadmap/spec update if release workflow expectations change.
- Operational checklist for local and CI execution.
