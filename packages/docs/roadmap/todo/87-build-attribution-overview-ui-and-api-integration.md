# Story 87: Build attribution overview UI and API integration

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 86

## Goal
Provide a usable attribution overview in the web app that surfaces before/after outcomes by campaign/post and promoted menu item.

## Why This Matters
- Gives restaurant marketers direct visibility into what actually worked.
- Makes attribution data actionable instead of hidden behind raw endpoints.
- Creates a shared truth surface for marketer and analyst review.

## Scope
- Add attribution overview section/page in analytics workflow.
- Integrate existing attribution API/mart data into a structured UI table/card layout.
- Include branch/report context and date window visibility.
- Include empty/error states with recovery guidance.

## Acceptance Criteria
- User can open attribution UI from analytics context and see campaign/post outcome rows.
- Each row includes promoted item, baseline window, observed window, and delta signal fields.
- Empty state is explicit when no attribution data exists.
- UI handles API failure with a non-breaking fallback message.

## Deliverables
- Attribution overview UI route/component(s).
- Typed API integration utilities and view models.
- Basic UI test coverage for loaded and empty states.

## Dependencies
- Story 86

