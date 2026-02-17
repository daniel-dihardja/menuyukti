# Story 162: Implement Deterministic Caption CTA Hashtag Generation

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Generate stable, explainable caption variants and CTA/hashtag suggestions from scheduler and analytics signals.

## Why This Matters
- MVP needs reliable output quality without brittle random generation.

## Scope
- Implement template/rule-based generator for caption variants.
- Generate CTA and hashtag sets by offer type and menu focus.
- Inject branch/location context, including currency where relevant.

## Acceptance Criteria
- Same input produces same generated variants.
- Output includes at least 2 caption variants per suggestion.
- CTA and hashtags are non-empty and policy-compliant.
- Generator covered by unit tests for major offer types.

## Deliverables
- Generation module and shared types.
- Tests for deterministic generation and formatting.
- Integration wiring into composer prefill path.
