# Planning Workflow Lifecycle Trace Example v1

This document demonstrates one full story lifecycle and one full epic lifecycle using the workflow rules.

## Example Story Trace

Story: `story-xyz-01-contract-hardening.md`  
Parent: `EPIC-XYZ-CONTRACT-HARDENING`

1. Create
- File created in `docs/planning/todo/`
- Initial status: `todo`

2. Start implementation
- Status updated to `in_progress`
- Implementation changes begin

3. Finish implementation
- Acceptance criteria verified
- Story notes updated with:
  - `Implementation Notes`
  - `Test Evidence`

4. Close
- Status set to `done`
- Story moved to:
  - `docs/planning/archive/EPIC-XYZ-CONTRACT-HARDENING/story-xyz-01-contract-hardening.md`
- Closure commit includes:
  - code/doc changes
  - moved story file

## Example Epic Trace

Epic: `epic-contract-hardening.md`  
Epic ID: `EPIC-XYZ-CONTRACT-HARDENING`

1. Draft
- Epic created in `docs/planning/todo/`
- Status: `Draft`

2. In progress
- Stories generated and committed
- Epic status updated to `In Progress`

3. Story completion phase
- Each story implemented and archived one by one
- No completed stories left in `todo/`

4. Close epic
- Verify all epic stories archived
- Update epic status to `Done`
- Move epic file to:
  - `docs/planning/archive/EPIC-XYZ-CONTRACT-HARDENING/epic-contract-hardening.md`
- Commit epic closure move/status update
