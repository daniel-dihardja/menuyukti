# Story 157: Productize Instagram Post Generation From Scheduler (Epic)

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: none

## Goal
Deliver an MVP workflow where restaurant marketers receive weekly Instagram post suggestions derived from restaurant sales heatmap data, can convert each suggestion into a scheduler draft, review/edit it, and move it to a publish-ready state.

## Why This Matters
- Converts scheduler planning into executable marketing output with minimal manual effort.
- Gives restaurant marketers immediate Instagram value from existing analytics data.
- Ensures weekly post planning is data-driven from sales heatmap demand/profitability signals.
- Gives menu analysts a direct path to market menu actions (combo offers, happy hour, hero items).
- Establishes a repeatable content production workflow needed for MVP release readiness.

## UX Vision (MVP)
- Scheduler remains the command center.
- A weekly suggestion rail/list is visible at the top of scheduler and populated from sales heatmap signals.
- Each suggestion clearly explains why it was suggested (for example: high-demand hour, low-share category, promo opportunity).
- Every schedule slot has a clear post state: `Not Generated`, `Draft`, `Approved`, `Published`.
- Primary actions:
  - `Use Suggestion` (from weekly heatmap-derived recommendation)
  - `Generate Post` (manual from slot)
- A right-side composer panel opens with prefilled data:
  - campaign intent from schedule entry
  - recommended menu items from matrix/pairs/heatmap signals
  - caption variants
  - CTA + hashtag suggestions
  - recommended post time from schedule
- Marketer can edit copy quickly, choose one variant, save, approve, and export/publish.
- UX must avoid blocking navigation: scheduler page should always open, even if attribution data is partial.

## Non-Goals (MVP)
- Full autonomous creative generation with multi-asset design.
- Complex campaign calendar orchestration across multiple channels.
- Hard dependency on live Instagram API publishing for release gate.

## Scope
- Add scheduler-to-post draft domain model and persistence.
- Add weekly suggestion generation from heatmap outputs for the selected week.
- Build scheduler slot actions and post status indicators.
- Build prefilled composer UX for generation and editing.
- Implement deterministic caption generation from schedule + analytics signals.
- Add guardrails and validation for caption quality and business constraints.
- Implement publish-ready output (manual publish package) for MVP.
- Keep Instagram direct publishing optional behind feature flag.
- Add E2E release journey coverage for schedule-to-post workflow.
- Update user manual and release specs to reflect final behavior.

## Functional Requirements
- A user can see a weekly list of suggested Instagram posts generated from sales heatmap data.
- Suggestions must include at least:
  - suggested day/time window
  - menu focus
  - rationale from heatmap signal
  - recommended offer type
- A user can generate a post draft from any scheduler slot.
- A user can convert a weekly suggestion into a draft with one click.
- Generated draft includes:
  - campaign objective
  - menu item focus
  - offer framing (for example combo/happy hour/hero)
  - caption text
  - CTA
  - hashtags
  - scheduled publish time
- User can edit and save draft multiple times.
- User can mark draft as approved.
- User can export a publish package for manual posting.
- System records status transitions with timestamps.
- Currency and location context must be sourced from branch/location data.

## Data Engineering Requirements
- Input lineage for generated drafts must reference:
  - scheduler entry id
  - analytics id
  - source signals (heatmap required; matrix/pairs/attribution when available)
- Weekly suggestion generation must fail soft when optional sources are missing, but must not fail when heatmap data exists.
- Generation must be idempotent by slot + version key.
- Store prompt inputs/outputs in a structured JSON payload for auditability.
- Validation errors must be machine-readable for UI rendering.

## API/Contract Requirements
- Add contracts for:
  - draft create/regenerate
  - draft update/save
  - draft approve
  - draft publish-package export
- Return explicit error codes for readiness/guardrail failures.
- Contract documentation must be added under `packages/docs`.

## Quality and Observability
- Add unit tests for generation rules and guardrails.
- Add unit tests for weekly suggestion ranking/scoring from heatmap metrics.
- Add integration tests for API contracts and persistence.
- Add E2E test covering full user journey:
  - open scheduler
  - view weekly suggestions
  - apply suggestion into slot
  - generate draft
  - edit + save
  - approve
  - export publish package
- Add structured logs for generation events and failures.

## MVP Release Criteria
- Scheduler shows weekly heatmap-based suggestions reliably for seeded analytics data.
- Marketer can transform at least one weekly suggestion into an approved draft in one flow.
- Draft lifecycle states are visible and actionable in UI.
- Manual publish package works and is documented.
- No P0/P1 bugs in schedule-to-post E2E workflow.
- SPECS and manual are aligned with shipped behavior.

## Story Breakdown Plan
- Story 158: Add scheduler post-draft data model and persistence contract.
- Story 159: Generate weekly Instagram suggestions from heatmap signals and expose suggestion API.
- Story 160: Add suggestion rail + `Use Suggestion` action in scheduler UX.
- Story 161: Build post composer panel with prefilled analytics context.
- Story 162: Implement caption/CTA/hashtag generator with deterministic templates.
- Story 163: Add post quality guardrails and validation messaging.
- Story 164: Add draft save + approve lifecycle API and UI state transitions.
- Story 165: Add manual publish package export for marketer handoff.
- Story 166: Add E2E schedule-to-post release journey.
- Story 167: Update user manual and SPECS for Instagram post generation.

## Dependencies
- Existing scheduler data contract and storage readiness checks.
- Existing matrix/pairs/heatmap outputs for recommendation context.
- Existing branch/location currency and identity fields.

## Risks
- Weak analytics context may generate low-quality drafts.
- Missing branch metadata can degrade CTA and offer quality.
- Overly strict guardrails could block marketer flow.

## Mitigations
- Provide editable draft defaults and clear fallback copy.
- Show missing-input warnings without blocking scheduler access.
- Use soft warnings first; only hard-block on invalid save payloads.

## Deliverables
- Epic definition and implementation plan in roadmap.
- Child stories with acceptance criteria and parent linkage.
- Ready-to-implement backlog aligned with MVP scope.
