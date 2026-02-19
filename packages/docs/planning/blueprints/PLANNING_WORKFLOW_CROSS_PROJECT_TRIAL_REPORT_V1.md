# Planning Workflow Cross-Project Trial Report v1

## Trial Summary
- Trial target project: `apps/agents` (non-menuyukti implementation area in same monorepo)
- Trial objective: verify planning-workflow process can be followed outside menuyukti package stream
- Trial scope: epic creation -> story creation -> story close simulation

## Trial Preconditions
- Planning root configured to project-default convention:
  - `docs/planning`
- Skill config contract and path resolution specs available:
  - `PLANNING_WORKFLOW_CONFIG_CONTRACT_V1.md`
  - `PLANNING_WORKFLOW_PATH_RESOLUTION_V1.md`

## Trial Steps (End-to-End)

1. Initialize planning artifacts for trial domain
- Create trial epic draft following epic template.
- Validate using epic quality gate checklist.

2. Generate trial stories
- Create two small stories from trial epic.
- Verify naming and metadata (`Parent`, status, story points).

3. Simulate one implementation and close
- Update one trial story with implementation notes + test evidence.
- Move story from `todo/` to `archive/<EPIC_ID>/`.
- Validate atomic closure commit rule.

4. Verify deterministic archive targets
- Confirm archive path derived from `Parent` epic id.
- Confirm no completed story remains in `todo/`.

## Trial Outcome
- Workflow is usable in a non-menuyukti project context.
- Path resolution and archive targeting remained deterministic.
- Guardrails are understandable and mostly enforceable through process discipline.

## Observed Friction
- Teams may skip metadata fields without lint/check automation.
- Commit message quality can drift without examples at hand.
- Reopen/rollback paths need slightly clearer quick-reference guidance.
