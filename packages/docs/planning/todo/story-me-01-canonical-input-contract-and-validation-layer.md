# Story ME-01: Canonical Input Contract and Validation Layer

## Story Metadata
- Created Date: 2026-02-18
- Status: `todo`
- Parent: EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT

## Goal
Define a strict canonical input contract with predictable validation, defaults, and error semantics.

## Why This Matters
- Prevents malformed payloads from silently propagating.
- Creates stable boundaries for downstream features and agents.

## Scope
- Standardize `CoreInputs` validation behavior.
- Define required vs optional fields and default handling.
- Normalize error codes/messages for invalid input.

## Acceptance Criteria
- Invalid payloads fail with clear reason codes/messages.
- Valid payloads normalize consistently across repeated runs.
- Unit tests cover required validation branches and edge cases.

## Deliverables
- Input contract updates in `core/inputs` and related models.
- Unit tests for valid/invalid/default scenarios.
- Contract usage notes in package README (or linked doc).
