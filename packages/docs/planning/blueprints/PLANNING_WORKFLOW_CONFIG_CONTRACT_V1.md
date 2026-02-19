# Planning Workflow Config Contract v1

## Version
- Contract: `planning-workflow-config-v1`
- Status: Draft baseline for story `PWS-01`

## Purpose
Define how the `planning-workflow` skill resolves project paths and naming conventions without hard-coding a specific repository layout.

## Default Recommendation
- Use `docs/planning/` at repository root as the default planning home.
- Override only when a repository already has a different docs convention.

## Required Keys

1. `planning_root` (`string`)
- Description: root planning directory.
- Example: `docs/planning`

2. `todo_dir` (`string`)
- Description: open stories/epics directory.
- Example: `docs/planning/todo`

3. `archive_dir` (`string`)
- Description: closed stories/epics base directory.
- Example: `docs/planning/archive`

## Optional Keys

1. `blueprints_dir` (`string`)
- Default: `<planning_root>/blueprints`

2. `specs_file` (`string`)
- Default: `<planning_root>/SPECS.md`

3. `planning_readme_file` (`string`)
- Default: `<planning_root>/README.md`

4. `epic_file_prefix` (`string`)
- Default: `epic-`

5. `story_file_prefix` (`string`)
- Default: `story-`

6. `epic_archive_id_pattern` (`string`)
- Default: `EPIC-<DOMAIN>-<TOPIC>`
- Notes: uppercase, hyphen-separated segments.

7. `allow_auto_create_dirs` (`boolean`)
- Default: `true`
- Behavior: if `true`, missing planning folders are created; if `false`, validation fails.

## Defaults

When no config is provided, skill resolves to:

```yaml
planning_root: docs/planning
todo_dir: docs/planning/todo
archive_dir: docs/planning/archive
blueprints_dir: docs/planning/blueprints
specs_file: docs/planning/SPECS.md
planning_readme_file: docs/planning/README.md
epic_file_prefix: epic-
story_file_prefix: story-
epic_archive_id_pattern: EPIC-<DOMAIN>-<TOPIC>
allow_auto_create_dirs: true
```

## Minimal Example

```yaml
planning_root: docs/planning
todo_dir: docs/planning/todo
archive_dir: docs/planning/archive
```

## Full Example

```yaml
planning_root: docs/planning
todo_dir: docs/planning/todo
archive_dir: docs/planning/archive
blueprints_dir: docs/planning/blueprints
specs_file: docs/planning/SPECS.md
planning_readme_file: docs/planning/README.md
epic_file_prefix: epic-
story_file_prefix: story-
epic_archive_id_pattern: EPIC-<DOMAIN>-<TOPIC>
allow_auto_create_dirs: true
```

## Validation Rules

1. Required key presence
- `planning_root`, `todo_dir`, and `archive_dir` must exist in config (or be resolved by defaults).

2. Path normalization
- All configured paths are repository-relative.
- No `..` traversal allowed outside repository root.

3. Directory existence policy
- If `allow_auto_create_dirs=true`, create missing `todo`, `archive`, and `blueprints` folders.
- If `allow_auto_create_dirs=false`, fail fast with clear missing-path error.

4. Archive id format
- Epic archive folders must follow `EPIC-<DOMAIN>-<TOPIC>` uppercase hyphen style.

5. Prefix sanity
- `epic_file_prefix` and `story_file_prefix` must be non-empty and filesystem-safe.

## Validation Checklist (Operator)

- [ ] Required keys defined or defaults resolved.
- [ ] `planning_root` points to intended repo location.
- [ ] `todo_dir` and `archive_dir` are writable.
- [ ] `allow_auto_create_dirs` behavior chosen intentionally.
- [ ] Archive folder naming pattern is documented and followed.
- [ ] Minimal and full examples are available for onboarding.
