# Planning Workflow Story Template v1

Use this template for new stories in `docs/planning/todo/`.

```md
# Story <id>: <short title>

## Story Metadata
- Created Date: YYYY-MM-DD
- Status: `todo`
- Parent: <EPIC_ID>
- Story Points: `<3-5>`

## Goal
<one clear outcome>

## Why This Matters
- <impact>

## Scope
- <in scope>
- <in scope>

## Acceptance Criteria
- <verifiable outcome>
- <verifiable outcome>

## Deliverables
- <artifact>
- <artifact>
```

## Done-State Requirements

When a story is completed, the file must also include:
- `Implementation Notes`
- `Test Evidence`
  - Use explicit command + result when tests exist
  - For docs-only stories write: `Test impact: N/A`

## Naming and Location Rules
- Open story path: `docs/planning/todo/story-<id>-<topic>.md`
- Closed story path: `docs/planning/archive/<EPIC_ID>/story-<id>-<topic>.md`
