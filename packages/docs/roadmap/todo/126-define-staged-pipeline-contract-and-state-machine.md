# Story 126: Define staged pipeline contract and state machine

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 125

## Goal
Define a single pipeline contract with explicit stages and state transitions.

## Why This Matters
- Eliminates ambiguity between upload and COGS recompute paths.
- Creates a stable backbone for runner and retry behavior.

## Scope
- Define stages (minimum): `upload_ingest`, `cogs_enrichment`, `matrix_materialization`.
- Define transition model: `queued -> running -> succeeded|failed`.
- Define stage dependencies and trigger semantics.
- Define stage-level error codes and retryability classification.

## Acceptance Criteria
- Contract is codified in code/docs and referenced by APIs/workers.
- No stage uses ad-hoc statuses outside the contract.

## Deliverables
- Stage/state constants/types.
- Contract notes in roadmap docs.
