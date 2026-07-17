# Menuyukti feature glossary (for AI assistants)

Use this when the user names a product feature, alias, or asks where something lives in the repo. Prefer the paths and symbols here before guessing.

## Table

| Terms / aliases                                                           | Primary paths                                                                                                                                                                                   | Key symbols                                                                                                                                                | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| workflow preset, workflow import preset, built-in workflow, import preset | `apps/web/lib/workflows/presets/*.json`, `apps/web/lib/workflows/presets/index.ts`                                                                                                              | `WORKFLOW_IMPORT_PRESETS`, `WorkflowImportPresetId`, `WorkflowImportPreset`, `PRESET_KEY_PREFIX`, `presetSelectionKey`, `parsePresetIdFromSelectionKey`    | Shipped JSON payloads that match `workflowImportPayload` from `apps/graphql/workflow_export_schema.json`; listed first in the workflow import dialog and in new-workflow preset pickers. Preset IDs: `public-holidays-example`, `campaign-planning-multi-skill`, `langgraph-tracing-demo`.                                                                                                                                                       |
| milestone preset, prefilled milestone, milestone template                 | `apps/web/lib/milestones/preset-definitions.ts`, `apps/web/lib/graphql/node-schemas/milestone-presets.ts`, `apps/web/app/(protected)/workflow/_components/timeline/milestone-preset-select.tsx` | `MILESTONE_PRESET_IDS`, `MilestonePresetId`, `MILESTONE_PRESET_REGISTRY`, `getMilestonePresetCreateFields`, `isMilestonePresetId`, `MilestonePresetSelect` | Single-milestone create helpers from the campaign timeline toolbar: POST milestone then PATCH with prefilled name, `presetId`, structured Data-tab payload, and optional pass criteria. **Not** the same as workflow import presets. Preset ids: `dates`, `restaurant_campaign_brief`, `promotion_candidates`, `menu_tagger`, `menu_clusterer`, `culture_hooks`, `ig_profile`, `ig_plan`, `ig_menu_picker`, `ig_format`, `ig_text`, `scheduler`. |
| milestone run preset, agents preset                                       | `apps/agents/agents/core/milestone_run/<preset_id>/`, `apps/agents/agents/core/milestone_run/graph.py`                                                                                          | `register_preset_runner`, `get_preset_runner`, `build_milestone_run_graph`                                                                                 | LangGraph subgraph executed when a milestone runs; keyed by `milestone.data.presetId`. Registered ids must match web `MILESTONE_PRESET_IDS`.                                                                                                                                                                                                                                                                                                     |
| style pack, visual style, location style, Instagram style                 | `apps/graphql/data_sources/models/location_style.py`, `apps/web/app/api/location-styles/`, `apps/web/lib/posts/build-instagram-post-prompt.ts`, `apps/web/app/api/posts/generate/route.ts`      | `LocationStyle`, `locationStyles`, `createLocationStyle`, `StylePackPrompt`, `styleId` on generate                                                         | Location-scoped reusable look (name + textual rules + one media reference image). Managed on the location detail page; selected in Post Creator and injected into Leonardo generation via `styleId`.                                                                                                                                                                                                                                             |

### UI touchpoints (workflow import presets)

- `apps/web/app/(protected)/workflow/_components/timeline/import-workflow-dialog.tsx`
- `apps/web/app/(protected)/workflow/_components/create-workflow-panel.tsx`
- `apps/web/app/(protected)/workflow/_components/workflows-client.tsx`

### UI touchpoints (milestone presets)

- `apps/web/app/(protected)/workflow/_components/timeline/timeline-workspace.tsx`
- `apps/web/app/(protected)/workflow/_components/timeline/timeline-workspace-views.tsx` (`TimelineWorkspaceEmpty`)
- `apps/web/app/(protected)/workflow/_components/timeline/milestone-preset-select.tsx`

### Catalog UI (presets + chat tools)

- `apps/web/app/(protected)/skills/page.tsx`
- `apps/web/lib/milestone-run-skill-registry.ts` (`MILESTONE_PRESET_RUN_REGISTRY`)
- `apps/web/lib/milestone-run-tools-registry.ts` (`CHAT_TOOLS_REGISTRY`)

### UI touchpoints (style packs)

- `apps/web/app/(protected)/analytics/locations/location-styles-section.tsx` (CRUD on location detail)
- `apps/web/app/(protected)/canvas/post-creator/_components/post-creator-prompt-pane.tsx` (location + style pickers)

## Adding a row

Append a new table row (or a short subsection if a feature needs more than one path). Keep **terms** as the phrases users are likely to say; keep **key symbols** to exports or types agents can grep.
