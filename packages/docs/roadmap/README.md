# Roadmap Workflow Guide

This guide defines how implementation work must be executed in this project.

## Required Workflow

1. Commit all newly created open stories in `todo/`.
2. Start implementing one story.
3. When the story is finished, remove that story file from `todo/`.
4. Commit the deleted story file together with all implementation code changes for that story.

## Working Rules

- Implement one story at a time.
- Do not leave completed stories in `todo/`.
- A story is considered complete only when both are true:
  - implementation changes are done
  - the corresponding story file is deleted from `todo/` and included in the same commit

## Roadmap Directory Structure

- `todo/`: Open stories that are ready to be implemented.
- `complete/`: Completed stories kept for historical reference.
- `SPECS.md`: Current MVP/release specification and open-feature tracking.

## Markdown Story Spec

Every story file in `todo/` and `complete/` should follow this structure:

1. Title:
   - `# Story <id>: <short title>`
2. `## Story Metadata` with:
   - `Created Date: YYYY-MM-DD` (required)
   - `Status: \`todo\` | \`in_progress\` | \`complete\`` (required)
   - `Completed Date: YYYY-MM-DD` (required only when `Status` is `complete`)
   - `Parent: <epic-or-story-id>` (optional, for grouping)
3. `## Goal` (required)
4. `## Why This Matters` (required)
5. `## Scope` (required)
6. `## Acceptance Criteria` (required)
7. `## Deliverables` (required)

Optional sections:
- `## Data Engineering Requirements`
- `## Dependencies`
- `## Notes`

## Story Grouping

Story grouping is supported via metadata:

- Use `Parent` to link a story to a higher-level story/epic.
- Suggested format:
  - Parent epic story: `Parent: none` (or omit field)
  - Child story: `Parent: 73` (or other story/epic ID)

Recommendation:
- Keep grouping lightweight with `Parent` (as you suggested).
- If needed later, add `Type: epic|story|task` in metadata, but this is optional for now.

## Story Template

```md
# Story <id>: <short title>

## Story Metadata
- Created Date: YYYY-MM-DD
- Status: `todo`
- Parent: <id-or-none>

## Goal
<one clear outcome>

## Why This Matters
- <business/technical impact>

## Scope
- <in scope>
- <in scope>

## Acceptance Criteria
- <verifiable outcome>
- <verifiable outcome>

## Deliverables
- <artifact/code/docs/tests>
```
