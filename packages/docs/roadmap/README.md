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
