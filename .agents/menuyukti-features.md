# Menuyukti feature glossary (for AI assistants)

Use this when the user names a product feature, alias, or asks where something lives in the repo. Prefer the paths and symbols here before guessing.

## Table

| Terms / aliases                                                           | Primary paths                                                                                                                          | Key symbols                                                                                                                                             | What it is                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| workflow preset, workflow import preset, built-in workflow, import preset | `apps/web/lib/workflows/presets/*.json`, `apps/web/lib/workflows/presets/index.ts`                                                     | `WORKFLOW_IMPORT_PRESETS`, `WorkflowImportPresetId`, `WorkflowImportPreset`, `PRESET_KEY_PREFIX`, `presetSelectionKey`, `parsePresetIdFromSelectionKey` | Shipped JSON payloads that match `workflowImportPayload` from `apps/graphql/workflow_export_schema.json`; listed first in the workflow import dialog and in new-workflow preset pickers. Preset IDs: `public-holidays-example`, `campaign-planning-multi-skill`, `langgraph-tracing-demo`, `custom-api-tool-mock-demo`. |
| milestone preset, prefilled milestone, milestone template                 | `apps/web/lib/milestones/preset-definitions.ts`, `apps/web/app/(protected)/workflows/_components/timeline/milestone-preset-select.tsx` | `MILESTONE_PRESET_IDS`, `MilestonePresetId`, `getMilestonePresetCreateFields`, `isMilestonePresetId`, `MilestonePresetSelect`                           | Single-milestone create helpers from the campaign timeline toolbar: POST milestone then PATCH with prefilled name, `presetId`, structured Data-tab payload, and optional pass criteria. Not the same as workflow import presets. Preset ids: `dates`, `restaurant_campaign_brief`.                                      |

### UI touchpoints (workflow presets)

- `apps/web/app/(protected)/workflows/_components/timeline/import-workflow-dialog.tsx`
- `apps/web/app/(protected)/workflows/_components/create-workflow-panel.tsx`
- `apps/web/app/(protected)/workflows/_components/campaigns-client.tsx`

### UI touchpoints (milestone presets)

- `apps/web/app/(protected)/workflows/_components/timeline/timeline-workspace.tsx`
- `apps/web/app/(protected)/workflows/_components/timeline/timeline-workspace-views.tsx` (`TimelineWorkspaceEmpty`)

## Adding a row

Append a new table row (or a short subsection if a feature needs more than one path). Keep **terms** as the phrases users are likely to say; keep **key symbols** to exports or types agents can grep.
