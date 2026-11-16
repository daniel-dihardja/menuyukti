---
id: TASK-16
title: Enable inventar feature flag
status: Done
assignee: []
created_date: '2026-11-16T08:42:00Z'
updated_date: '2026-11-16T08:43:00Z'
labels:
  - web
  - inventar
dependencies: []
references:
  - apps/web/config/feature-flags.json
  - apps/web/messages/en/inventar.json
  - .agents/menuyukti-features.md
priority: high
type: enhancement
ordinal: 65000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Operators cannot discover or open inventory because inventar was MVP-hidden after TASK-3, even though GraphQL, web UI/BFF, and the inventar chat mode are already built. Product needs inventar as a live operator surface again for all signed-in operators.

Out of scope: TASK-2 area CRUD under inventar, agent stock write tools, API kill-switch for /api/inventory-\*.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 inventar.enabled is true with audience all in feature-flags.json
- [x] #2 Signed-in operators see Inventory in nav and can open /inventar and /inventar/catalog without redirect to /continue
- [x] #3 messages/id/inventar.json ships and indonesian-overlays tests require it as an enabled catalog
- [x] #4 feature-flags tests assert inventar nav and paths enabled; menuyukti-features.md no longer says MVP-off
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Flip inventar.enabled to true and refresh description in feature-flags.json.
2. Add messages/id/inventar.json overlay of en/inventar.json; move inventar.json from DISABLED_FEATURE_FILES to EXPECTED_ID_FILES.
3. Update feature-flags.test.ts for inventar enabled (nav + paths); keep other MVP-offs.
4. Update menuyukti-features.md inventar row to enabled:true.
5. Run web feature-flags + indonesian-overlays tests and typecheck.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Flipped inventar.enabled to true; added id/inventar.json + loadIndonesianOverlays import; updated feature-flags and indonesian-overlays tests; glossary row now enabled:true.

Verified: vitest feature-flags (16) + indonesian-overlays (5) passed; web typecheck clean. Flag inventar.enabled=true audience=all; id/inventar.json present and loaded in loadIndonesianOverlays.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Enabled inventar for all operators by flipping feature-flags.json inventar.enabled to true, shipping messages/id/inventar.json (and wiring it in loadIndonesianOverlays), updating feature-flag and Indonesian overlay tests, and correcting the menuyukti-features glossary. Vitest (21) and web typecheck passed. Follow-up remains TASK-2 (area CRUD under inventar); optional Warung seed via make -C apps/graphql dev-data for empty workspaces.

<!-- SECTION:FINAL_SUMMARY:END -->
