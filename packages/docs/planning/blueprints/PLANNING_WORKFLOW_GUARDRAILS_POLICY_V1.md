# Planning Workflow Guardrails Policy v1

## Core Guardrails

1. Single-Story Focus
- Only one story should be actively implemented at a time per workflow lane.

2. Evidence-First Closure
- No story closure without acceptance evidence.
- For docs-only stories, evidence must explicitly state `Test impact: N/A`.

3. Archive Discipline
- Completed stories cannot remain in `todo/`.
- Completed epics cannot remain in `todo/`.

4. Atomic Closure Commit
- Story closure must include implementation changes and story-file move in the same commit.
- Epic closure must include status update and epic-file move in the same commit.

5. Naming and Location Integrity
- Story and epic files must follow naming conventions.
- Archive folders must follow `EPIC-<DOMAIN>-<TOPIC>`.

## Exception Handling

Blocked story:
- mark `blocked`
- log blocker and owner
- do not archive while blocked

Rollback needed:
- reopen story to `in_progress`
- add rollback reason in story notes
- continue until acceptance criteria are re-satisfied

Reopened epic:
- move epic back to `todo/` only if active work resumes
- reopen with explicit reason and impacted stories list

## Enforcement Checklist

- [ ] Only one story currently in `in_progress`.
- [ ] Open stories are inside `todo/`.
- [ ] Closed stories are inside `archive/<EPIC_ID>/`.
- [ ] Closure commits are atomic and traceable.
- [ ] Exceptions are documented with explicit reason.
