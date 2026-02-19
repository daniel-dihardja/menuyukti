# Planning Workflow Path Resolution v1

## Version
- Spec: `planning-workflow-path-resolution-v1`
- Parent epic: `EPIC-PLANNING-WORKFLOW-SKILL`

## Goal
Define deterministic path resolution for planning workflow operations so files are always created/moved in predictable locations across repositories.

## Canonical Directory Expectations

Default repository layout:

```text
docs/
  planning/
    README.md
    SPECS.md
    todo/
    archive/
    blueprints/
```

Default recommendation:
- Use repository-root `docs/planning/` unless explicitly overridden.

## Resolution Order (Deterministic)

For each path, resolution order is:

1. Explicit config value.
2. Derived value from `planning_root`.
3. Hard default rooted at repository root.

Resolved outputs:
- `planning_root`
- `todo_dir`
- `archive_dir`
- `blueprints_dir`
- `specs_file`
- `planning_readme_file`

## Normalization Rules

1. Treat configured paths as repository-relative.
2. Normalize path separators and remove `.` segments.
3. Reject traversal outside repository root (`..` escape).
4. Store resolved paths in normalized relative form.

## Missing Folder Policy

Control key:
- `allow_auto_create_dirs` (`true` by default)

Behavior:
- `true`:
  - create missing `todo_dir`, `archive_dir`, and `blueprints_dir`
  - never silently create file contents
- `false`:
  - fail fast if required directories are missing
  - return explicit missing-path errors

## Deterministic Archive Target Rules

Story close target:
- input:
  - source story path in `todo_dir`
  - story metadata `Parent: <EPIC_ID>`
- output:
  - `<archive_dir>/<EPIC_ID>/<story-filename>.md`

Epic close target:
- input:
  - source epic path in `todo_dir`
  - epic id in file content
- output:
  - `<archive_dir>/<EPIC_ID>/<epic-filename>.md`

Constraints:
- `<EPIC_ID>` must match `EPIC-<DOMAIN>-<TOPIC>` uppercase hyphen style.
- If epic archive folder does not exist:
  - create when `allow_auto_create_dirs=true`
  - fail when `allow_auto_create_dirs=false`

## Worked Example: Default Project Paths

Input config:

```yaml
planning_root: docs/planning
todo_dir: docs/planning/todo
archive_dir: docs/planning/archive
allow_auto_create_dirs: true
```

Story:
- source: `docs/planning/todo/story-abc-01.md`
- parent: `EPIC-ABC-PLATFORM`
- target: `docs/planning/archive/EPIC-ABC-PLATFORM/story-abc-01.md`

## Worked Example: Custom Planning Root

Input config:

```yaml
planning_root: docs/workflow-planning
todo_dir: docs/workflow-planning/open
archive_dir: docs/workflow-planning/archive
allow_auto_create_dirs: false
```

Epic:
- source: `docs/workflow-planning/open/epic-platform-ops.md`
- id: `EPIC-PLATFORM-OPS`
- target: `docs/workflow-planning/archive/EPIC-PLATFORM-OPS/epic-platform-ops.md`

## Validation Checklist

- [ ] Explicit config overrides are applied before defaults.
- [ ] No resolved path escapes repository root.
- [ ] Missing-folder behavior matches `allow_auto_create_dirs`.
- [ ] Story archive target is derived from `Parent` epic id.
- [ ] Epic archive target is derived from epic id.
- [ ] Resulting target path is deterministic for repeated runs.
