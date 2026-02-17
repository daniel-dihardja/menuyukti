# Story 161: Build Post Composer Panel With Prefilled Context

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 157

## Goal
Provide a right-side composer panel where marketers can review and edit generated post content.

## Why This Matters
- Suggested content must be editable to fit brand voice and campaign intent.

## Scope
- Build composer panel UI.
- Prefill campaign intent, menu focus, suggested publish time, caption variants, CTA, and hashtags.
- Allow variant switching and inline editing.

## Acceptance Criteria
- Composer opens from both `Generate Post` and `Use Suggestion` actions.
- Marketer can edit and save text fields without losing state.
- Composer shows source context summary for trust.
- Form validation messages are user-friendly.

## Deliverables
- Composer panel component.
- Local state model + submit payload shape.
- UI tests for prefill/edit interactions.
