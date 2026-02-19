# Planning Workflow Command Playbook v1

## Purpose
Provide standard command sequences and commit conventions for operating the planning workflow.

## Standard Command Sequences

### A) Create/Refine Epic
```bash
# edit epic file
$EDITOR docs/planning/todo/epic-<topic>.md

# stage and commit epic refinement
git add docs/planning/todo/epic-<topic>.md
git commit -m "docs(planning): refine <EPIC_ID> epic"
```

### B) Generate Stories
```bash
# create story files in todo/
$EDITOR docs/planning/todo/story-<id>-<topic>.md

# commit story creation before implementation starts
git add docs/planning/todo/story-*.md
git commit -m "docs(planning): add <EPIC_ID> stories"
```

### C) Implement Story
```bash
# implement scope changes (code/docs/tests)
# update story with implementation notes and test evidence
$EDITOR docs/planning/todo/story-<id>-<topic>.md
```

### D) Close Story (Atomic)
```bash
mv docs/planning/todo/story-<id>-<topic>.md \
   docs/planning/archive/<EPIC_ID>/story-<id>-<topic>.md

git add <implementation files> \
        docs/planning/archive/<EPIC_ID>/story-<id>-<topic>.md \
        docs/planning/todo/story-<id>-<topic>.md
git commit -m "docs(planning): complete <STORY_ID> <short-title>"
```

### E) Close Epic
```bash
mv docs/planning/todo/epic-<topic>.md \
   docs/planning/archive/<EPIC_ID>/epic-<topic>.md

git add docs/planning/archive/<EPIC_ID>/epic-<topic>.md \
        docs/planning/todo/epic-<topic>.md
git commit -m "docs(planning): close <EPIC_ID>"
```

## Commit Convention Table

| Stage | Pattern | Example |
|---|---|---|
| Epic refine | `docs(planning): refine <EPIC_ID> epic` | `docs(planning): refine EPIC-PLANNING-WORKFLOW-SKILL epic` |
| Story generation | `docs(planning): add <EPIC_ID> stories` | `docs(planning): add EPIC-PLANNING-WORKFLOW-SKILL stories` |
| Story close | `docs(planning): complete <STORY_ID> <short-title>` | `docs(planning): complete PWS-06 command playbook` |
| Epic close | `docs(planning): close <EPIC_ID>` | `docs(planning): close EPIC-PLANNING-WORKFLOW-SKILL` |

## Closure Transcript Example

```bash
# close story PWS-06
mv docs/planning/todo/story-pws-06-command-playbook-and-commit-conventions.md \
   docs/planning/archive/EPIC-PLANNING-WORKFLOW-SKILL/story-pws-06-command-playbook-and-commit-conventions.md

git add docs/planning/archive/EPIC-PLANNING-WORKFLOW-SKILL/story-pws-06-command-playbook-and-commit-conventions.md \
        docs/planning/todo/story-pws-06-command-playbook-and-commit-conventions.md \
        docs/planning/blueprints/PLANNING_WORKFLOW_COMMAND_PLAYBOOK_V1.md

git commit -m "docs(planning): complete PWS-06 command playbook"
```

## Guardrails
- Do not close a story without moving it to archive.
- Do not split implementation files and story move into separate commits.
- Keep one active implementation story at a time.
