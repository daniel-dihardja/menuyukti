# Planning Workflow Story Closure Checklist v1

Use this checklist before closing a story.

## Story Completion Gate
- [ ] Story scope is fully implemented.
- [ ] Acceptance criteria are met.
- [ ] Story status is `done`.

## Evidence Gate
- [ ] `Implementation Notes` summarize what changed.
- [ ] `Test Evidence` is present.
- [ ] If docs-only: `Test impact: N/A` is explicitly stated.

## File Lifecycle Gate
- [ ] Story is moved from `todo/` to `archive/<EPIC_ID>/`.
- [ ] Archive path uses the correct epic id folder.

## Commit Gate
- [ ] Code/doc changes and moved story file are in the same commit.
- [ ] Commit message clearly identifies story closure.

## Final Rule
- A story is not considered closed if it remains in `todo/`.
