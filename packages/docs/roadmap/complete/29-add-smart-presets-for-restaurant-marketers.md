# Story 29: Add Smart Presets for Restaurant Marketers

## Story Metadata
- Created Date: 2026-02-16
- Status: `complete`
- Completed Date: `2026-02-16`

## Goal
Deliver one-click preset views that map matrix data to common restaurant marketing decisions.

## Why This Matters
- Presets accelerate action for non-technical users.
- Presets create repeatable analysis patterns across branches.

## Scope
- Add presets: `Push Winners`, `Fix Pricing`, `Review Low Margin`, `Underperformers`.
- Encode each preset as explicit filter/sort rules.
- Allow manual refinement after preset application.

## Data Engineering Requirements
- Preset logic is deterministic and auditable.
- Preset definitions are centrally configurable.
- Preset state integrates with URL filter contract.

## Acceptance Criteria
- Preset selection updates results and visible filter chips correctly.
- Users can clear or modify preset output without broken state.
- Preset logic is unit-tested.

## Deliverables
- Preset rule definitions.
- Preset UI controls and integration.
