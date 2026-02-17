# Story 140: Add action readiness model for sales dropdown

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 139

## Goal
Introduce a deterministic readiness model that maps each dropdown action to required prerequisites.

## Why This Matters
- Readiness logic must be centralized to avoid inconsistent per-action behavior.
- Makes future feature gating and MVP scope changes easier.

## Scope
- Define readiness statuses (`ready`, `needs_cogs`, `needs_attribution_data`, `degraded`, `blocked`).
- Map actions to prerequisites:
  - Core-derived: matrix, pairs, heatmap, finance.
  - Dependency-derived: cogs entry, scheduler, attribution.
- Provide action-level reason codes/messages.

## Acceptance Criteria
- Each dropdown action resolves to one readiness status and optional reason.
- Readiness model is reusable by UI and tests.

## Deliverables
- Readiness model utility + typings.

## Dependencies
- Story 139.
