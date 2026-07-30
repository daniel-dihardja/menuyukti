# Menuyukti feature glossary (for AI assistants)

Use this when the user names a product feature, alias, or asks where something lives in the repo. Prefer the paths and symbols here before guessing.

## Table

| Terms / aliases                                        | Primary paths                                                                                                                                                                                                                                                                                                                 | Key symbols                                                                                                                                             | What it is                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| chat, advisor, agent thread, agentThreadId             | `apps/web/app/(protected)/agent/`, `apps/web/components/chat/`, `apps/web/app/api/chat/`, `apps/web/lib/routes.ts` (`routes.agent`), `apps/agents/agents/core/chat/`, `apps/agents/routers/chat.py`                                                                                                                           | `agentThreadId`, `agent_thread_id`, `CHAT_MODE_IDS`, `build_chat_graph`, `chat_tools_list`                                                              | Chat-first product home at **`/advisor`** (rewrites to `agent/` pages). Thread identity is **`agentThreadId`** only. Modes: `general` \| `story_image_assistant`. BFF `/api/chat` → agents `POST /chat`.                                                                                                                    |
| chat mode, story mode, story_image_assistant           | `apps/web/lib/chat/chat-modes.ts`, `apps/web/components/chat/`, `apps/agents/agents/core/chat/graph.py`                                                                                                                                                                                                                       | `CHAT_MODE_IDS`, `ChatModeId`, `story_image_assistant`                                                                                                  | Mode-driven chat: general (location/charts/media) vs story assistant (media + story scratchpad + IG image generate).                                                                                                                                                                                                        |
| style pack, visual style, Instagram style, style spec  | `apps/graphql/data_sources/models/visual_style.py`, `apps/web/app/api/styles/`, `apps/web/lib/styles/style-spec.ts`, `apps/agents/agents/core/style_spec/`, `apps/web/lib/posts/build-instagram-post-prompt.ts`, `apps/web/app/api/posts/generate/route.ts`, `apps/web/app/(protected)/ig-studio/styles/`                     | `VisualStyle`, `spec`, `StyleSpec`, `compileStyleSpec`, `parsePropertyOverrides`, `draft_style_spec_from_image`, `styleId` on generate                  | Workspace-scoped reusable look: Style Spec v2 JSON plus one media reference image on `VisualStyle`. Managed in IG Studio Styles; selected in Post Creator and compiled into Leonardo prompts via `styleId`. Post Creator chat can call `generate_instagram_post_image` (agents tool → same `/api/posts/generate` pipeline). |
| media collection, media library group, organize photos | `apps/graphql/data_sources/models/media_asset.py`, `apps/graphql/schema/queries/media_collections.py`, `apps/graphql/services/media_collections.py`, `apps/web/app/api/media/collections/`, `apps/web/app/api/media/backfill/`, `apps/web/app/(protected)/media/`, `apps/agents/agents/core/chat/media_collections_client.py` | `MediaAsset`, `MediaCollection`, `MediaCollectionMember`, `ensureMediaAsset`, `mediaCollections`, `mediaAssets`, `list_media_collections`, `list_media` | Workspace photo catalog (flat S3 keys) plus many-to-many named collections for grouping (e.g. style references). Media page filters/CRUD; upload/delete sync the catalog; chat can list collections and filenames.                                                                                                          |
| calendar, calendar entry, scheduler calendar           | `apps/web/app/(protected)/calendar/`, `apps/web/lib/calendar/`, `apps/web/app/api/calendar-entries/`, `apps/graphql/schema/queries/scheduler_calendar.py`, `apps/graphql/schema/mutations/create_calendar_entry.py`                                                                                                           | `CalendarEntry`, `schedulerCalendar`, `createCalendarEntry`, `updateCalendarEntry`                                                                      | Manual calendar entries and calendar UI. Prefer manual entries; no live workflow/milestone scheduler `sourceRef` product model.                                                                                                                                                                                             |

### Removed (do not implement as live product)

| Terms / aliases                                                    | Status                                                                                                                                                                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| milestone preset, milestone run, workflow container, timeline CRUD | **Removed** from the product model. Historical cleanup plan: [`packages/docs/menuyukti/remove-milestones.md`](../packages/docs/menuyukti/remove-milestones.md). Old `/workflow` URLs redirect to `/advisor`. |

### UI touchpoints (chat / advisor)

- `apps/web/app/(protected)/agent/` (list + thread; public path `/advisor`)
- `apps/web/components/chat/` (layout, composer, modes, story artifact, visualizations)
- `apps/web/app/api/chat/` (BFF → agents)

### UI touchpoints (style packs)

- `apps/web/app/(protected)/ig-studio/styles/` (Styles library; create/edit with CodeMirror JSON + media reference image)
- `apps/web/app/api/styles/draft-from-image/route.ts` (BFF → agents vision draft; Spec authoring helper)
- `apps/web/app/(protected)/ig-studio/post-creator/_components/post-creator-prompt-pane.tsx` (style picker)

### UI touchpoints (media collections)

- `apps/web/app/(protected)/media/` (filter chips, create/rename/delete, organize bar)
- `apps/web/app/api/media/collections/` (BFF)
- `apps/web/app/api/media/backfill/` (one-time S3 → catalog sync)
- Chat tools: `list_media_collections`, `list_media`

## Adding a row

Append a new table row (or a short subsection if a feature needs more than one path). Keep **terms** as the phrases users are likely to say; keep **key symbols** to exports or types agents can grep.
