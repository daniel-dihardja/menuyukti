# Planning Workflow Adoption Guide v1

## Who This Is For
- Teams starting a structured planning workflow in a repository for the first time.

## Quick Start (10 Minutes)

1. Confirm planning root
- Default: `docs/planning/`
- Ensure folders exist:
  - `todo/`
  - `archive/`
  - `blueprints/`

2. Create/refine epic
- Add epic in `todo/` using epic template.
- Validate epic with quality gate checklist.

3. Generate stories
- Add small, dependency-ordered stories in `todo/`.
- Commit epic + stories definition before implementation.

4. Execute stories one by one
- Implement one story at a time.
- Add implementation notes + test evidence.
- Move completed story to `archive/<EPIC_ID>/` in same closure commit.

5. Close epic
- Ensure all stories archived.
- Mark epic `Done`.
- Move epic to `archive/<EPIC_ID>/`.

## Operational Tips
- Keep stories small (3-5 points).
- Prefer deterministic naming and archive structure.
- Use command playbook snippets for closure commits.
- Treat docs-only stories explicitly as `Test impact: N/A`.

## Readiness Criteria for New Repo Adoption
- Config contract and path resolution accepted.
- Epic/story templates accepted by team.
- Guardrails and commit conventions understood.
- Trial run completed with at least one closed story.

## Common Pitfalls
- Closing stories without moving to archive.
- Splitting implementation and story move into separate commits.
- Missing `Parent` metadata in story files.

## Escalation
- If workflow breaks due to repo convention differences, override paths via config contract and document the override in epic notes.
