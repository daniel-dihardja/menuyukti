# Epic: Planning Workflow Skill

## Epic ID
EPIC-PLANNING-WORKFLOW-SKILL

## Owner
TBD

## Status
Draft

## Goal
Productize the current planning workflow (`todo -> implement -> archive`) as a reusable Codex skill so the same development method can be applied across projects with minimal setup.

## Skill Name
- Primary name: `Planning Workflow`
- Suggested skill id: `planning-workflow`

## Why This Epic
- The current workflow in `packages/docs/planning/README.md` is strong and repeatable.
- Reusing it manually in new repositories is slow and error-prone.
- A skill can enforce consistent story quality, closure discipline, and evidence-first delivery.

## In Scope
- Define a generic skill contract for planning workflow execution.
- Parameterize project-specific paths (for example `docs/planning`, archive folder naming).
- Include templates for epic and story documents.
- Include workflow guardrails:
  - one story in progress at a time
  - close only when implementation + evidence exist
  - move story/epic in same closure commit
- Include operational commands/checklist for:
  - starting a story
  - completing a story
  - closing an epic
- Add usage examples for onboarding in a new project.

## Required Folder Structure

Default structure expected by the skill:

```text
<project-root>/
  docs/
    planning/
      README.md
      SPECS.md
      todo/
        epic-<topic>.md
        story-<id>-<topic>.md
      archive/
        EPIC-<DOMAIN>-<TOPIC>/
          epic-<topic>.md
          story-<id>-<topic>.md
      blueprints/
        <design-or-migration-doc>.md
```

Required behavior:
- Open epics/stories live in `docs/planning/todo/`.
- Completed epics/stories move to `docs/planning/archive/<EPIC_ID>/`.
- `docs/planning/README.md` defines workflow rules and conventions.
- `docs/planning/SPECS.md` is the active product/release reference.
- `docs/planning/blueprints/` stores pre-implementation design docs.

Default-location recommendation:
- Use `docs/planning/` at the repository root as the default planning home.
- Only override this when a repository already enforces a different docs convention.

## Step-by-Step Usage Guide

### 1) Refine an Epic
- Create or open `docs/planning/todo/epic-<topic>.md`.
- Define:
  - goal
  - in-scope / out-of-scope
  - acceptance criteria
  - delivery sequence
- Ensure epic id and archive folder naming convention are set (`EPIC-<DOMAIN>-<TOPIC>`).
- Commit the refined epic document.

### 2) Generate Stories from the Epic
- Create story files in `docs/planning/todo/` using naming:
  - `story-<id>-<topic>.md`
- Each story must include:
  - metadata (`Created Date`, `Status: todo`, `Parent`)
  - goal
  - scope
  - acceptance criteria
  - deliverables
- Order stories according to dependencies and delivery sequence.
- Commit newly created stories before implementation starts.

### 3) Implement One Story
- Pick the next story in order.
- Set status to `in_progress` (optional but recommended).
- Implement only that story’s scope.
- Add required tests/evidence for acceptance criteria.
- Update story notes with:
  - implementation summary
  - test evidence (commands + results)

### 4) Close a Story
- Confirm acceptance criteria are met.
- Set story status to `done`.
- Move story file:
  - from `docs/planning/todo/`
  - to `docs/planning/archive/<EPIC_ID>/`
- Commit code changes + moved story file in the same commit.

### 5) Close the Epic
- Verify all epic stories are archived and completed.
- Update epic status to `Done`.
- Move epic file:
  - from `docs/planning/todo/`
  - to `docs/planning/archive/<EPIC_ID>/`
- Commit epic move/status update as epic-closure commit.

## Story Spec (Required Format)

Every story file must follow this structure:

1. Title
- `# Story <id>: <short title>`

2. Story Metadata
- `Created Date: YYYY-MM-DD`
- `Status: \`todo\` | \`in_progress\` | \`done\``
- `Parent: <EPIC_ID>`

3. Goal
- One clear outcome.

4. Why This Matters
- Business and/or technical value.

5. Scope
- Explicit in-scope items.
- Optional explicit out-of-scope notes.

6. Acceptance Criteria
- Verifiable outcomes only.
- Must be testable/observable.

7. Deliverables
- Expected artifacts (code/docs/tests/scripts).

8. Implementation Notes (required when done)
- Summary of what was changed.
- Key file references.

9. Test Evidence (required when done unless docs-only)
- Commands used.
- Result summary.
- If docs-only, explicitly write `Test impact: N/A`.

### Story Template

```md
# Story <id>: <short title>

## Story Metadata
- Created Date: YYYY-MM-DD
- Status: `todo`
- Parent: <EPIC_ID>

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

## Out of Scope
- Auto-generating code implementation from stories.
- Integrating with external PM tools (Jira/Linear/GitHub Projects) in this iteration.
- Multi-repo orchestration.

## Deliverables
- Skill spec document (workflow rules, configurable inputs, expected behavior).
- Skill template assets:
  - epic template
  - story template
  - closure checklist template
- Installation and usage documentation with examples.
- Validation checklist showing the skill can run this workflow in at least one non-menuyukti project.

## Versioned Workflow Spec

### Workflow Spec Version
- Current version: `Planning Workflow Spec v1`
- Backward compatibility target: compatible with existing `docs/planning/*` repositories.
- Versioning rule:
  - minor updates: clarify docs/templates without lifecycle changes
  - major updates: lifecycle or structure changes that require migration

### Epic Structure Spec (`v1`)

Every epic file must include:
- Title: `# Epic: <name>`
- Epic ID (`EPIC-<DOMAIN>-<TOPIC>`)
- Owner
- Status (`Draft` | `In Progress` | `Done`)
- Goal
- Why This Epic
- In Scope / Out of Scope
- Story List
- Acceptance Criteria
- Risks / Mitigations

Epic naming/location:
- Open epic: `docs/planning/todo/epic-<topic>.md`
- Closed epic: `docs/planning/archive/<EPIC_ID>/epic-<topic>.md`

### Story Structure Spec (`v1`)

Every story file must include:
- Title: `# Story <id>: <short title>`
- Story Metadata:
  - `Created Date`
  - `Status` (`todo` | `in_progress` | `done`)
  - `Parent` (`<EPIC_ID>`)
- Goal
- Why This Matters
- Scope
- Acceptance Criteria
- Deliverables

When closing a story, also require:
- Implementation Notes
- Test Evidence (or explicit `Test impact: N/A` for docs-only stories)

### Workflow Operation Spec (`v1`)

1. Refine epic in `todo/` with clear scope and acceptance criteria.
2. Generate ordered stories in `todo/` and commit story creation.
3. Implement one story at a time.
4. Close story by:
   - marking `done`
   - moving file to `archive/<EPIC_ID>/`
   - committing code + moved story in the same commit
5. Close epic by:
   - verifying all stories archived
   - marking epic `Done`
   - moving epic to `archive/<EPIC_ID>/`
   - committing epic closure

Compliance rules:
- No completed story should remain in `todo/`.
- One implementation story in progress at a time.
- Evidence-first closure: no close without acceptance proof.
- Prefer repository-root planning path (`docs/planning/`) unless explicitly overridden by config.

### Skill Config Contract Spec (`v1`)

The `planning-workflow` skill uses a config contract to support multi-repo usage without hard-coded paths.

- Required keys:
  - `planning_root`
  - `todo_dir`
  - `archive_dir`
- Optional keys:
  - `blueprints_dir`
  - `specs_file`
  - `planning_readme_file`
  - `epic_file_prefix`
  - `story_file_prefix`
  - `epic_archive_id_pattern`
  - `allow_auto_create_dirs`
- Default recommendation:
  - repository-root `docs/planning/`

Detailed contract, examples, and validation checklist:
- `packages/docs/planning/blueprints/PLANNING_WORKFLOW_CONFIG_CONTRACT_V1.md`

## Proposed Story List
1. **PWS-01: Skill Scope and Config Contract**
- Define required/optional config inputs and defaults.

2. **PWS-02: Template Pack**
- Create reusable epic/story/checklist templates.

3. **PWS-03: Workflow Guardrails**
- Encode story and epic lifecycle rules as actionable instructions.

4. **PWS-04: Command and Commit Conventions**
- Define standard move/close/commit flow with examples.

5. **PWS-05: Cross-Project Trial Run**
- Apply skill in a second project and capture gaps.

6. **PWS-06: Docs and Adoption Guide**
- Publish concise setup + usage guide for future projects.

## Acceptance Criteria
- A user can initialize planning workflow in a new project in under 10 minutes.
- The skill produces consistent epic/story files using templates.
- Closure workflow enforces archive moves and evidence discipline.
- Skill instructions are clear enough to be followed without project-specific tribal knowledge.

## Risks
- Overfitting to menuyukti directory structure.
- Too much rigidity for teams with different conventions.
- Skill drift if planning workflow evolves but skill docs are not updated.

## Mitigations
- Keep core workflow fixed but make paths/naming configurable.
- Provide optional conventions with sensible defaults.
- Add a maintenance section with versioning and update policy.
