---
id: TASK-17
title: German SEO and AI visibility for landing
status: Done
assignee: []
created_date: '2026-11-20T16:25:00Z'
updated_date: '2026-11-20T16:29:00Z'
labels: []
dependencies: []
ordinal: 66000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Marketing landing needs clearer DE SEO and AI-citation signals for Menuyukti as a company offering KI-Lösungen für die Gastronomie. POS messaging is canceled and must not appear on marketing SEO surfaces.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Landing has page-level generateMetadata with DE KI-Gastronomie title/description, canonical, indexable robots
- [x] #2 Root hreflang uses de and x-default only (not en pointing at same URL)
- [x] #3 Hero keeps brand H1; subtitle is semantic H2; FAQ and facts sections render in DE without POS/Kasse
- [x] #4 Organization and FAQPage JSON-LD on /; public/llms.txt allowed in robots
- [x] #5 No POS, Kasse, cashier, or inventar-as-POS in new marketing SEO copy
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Page metadata + hreflang de/x-default 2. Hero H2 + DE copy refresh 3. FAQ + facts sections (POS-free) 4. JSON-LD Organization + FAQPage 5. llms.txt + robots allow 6. Verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Implemented landing generateMetadata, de/x-default hreflang, hero H2, DE FAQ+facts, Organization+FAQPage JSON-LD, public/llms.txt + robots allow. Stripped POS from EN/ID landing FAQ/platform marketing strings and id metadata. Vitest indonesian-overlays passed; banned-term scan clean on SEO surfaces.

Refocused SEO copy on AI solutions covering both operations (Betrieb) and marketing across DE/EN/ID metadata, landing hero/FAQ/facts, and llms.txt.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Landing SEO/AI pack for Menuyukti as KI-Lösungen für die Gastronomie: page metadata, semantic H2, FAQ+facts, Organization+FAQPage JSON-LD, llms.txt. No POS/Kasse on marketing SEO surfaces. Verified via vitest overlays + file scans.

<!-- SECTION:FINAL_SUMMARY:END -->
