---
id: TASK-6
title: Add Indonesian UI locale for enabled MVP features
status: Done
assignee: []
created_date: '2026-10-27T13:30:00Z'
updated_date: '2026-10-27T13:39:00Z'
labels: []
dependencies: []
ordinal: 20000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

Operators and guests in Indonesia need Bahasa Indonesia UI. English catalogs exist; German is partial. Scope is enabled feature-flags only (no fiscal/POS, no disabled inventar/playbooks/etc.).

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 AppLocale includes id; Accept-Language id/id-\* and NEXT_LOCALE cookie select Indonesian
- [x] #2 messages/id overlays deep-merge for enabled-feature namespaces and shared shell
- [x] #3 Account menu offers EN|ID language control that sets NEXT_LOCALE
- [x] #4 Unit tests cover locale resolution and cookie preference
- [x] #5 Disabled-feature and fiscal catalogs are not required in id overlays
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Extend load-messages + request.ts for id locale and NEXT_LOCALE cookie.
2. Add EN|ID control in account menu.
3. Add messages/id overlays for shell + enabled-feature namespaces (deep-merge).
4. Unit tests for locale resolution and cookie preference.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Implemented id locale plumbing (cookie + Accept-Language), EN|ID account menu toggle, and ~2575 Indonesian overlay strings for enabled features + shell. Vitest: tests/i18n/\* and locale-preference (19 passed). tsc clean for apps/web.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Added Bahasa Indonesia UI locale for enabled MVP features. AppLocale now includes id; NEXT_LOCALE cookie overrides Accept-Language; messages/id deep-merges onto English for shell + enabled flags (digital menu, voting, chat, analytics, admin studio/CRM/etc.). Account menu offers EN|ID. Disabled-feature catalogs intentionally omitted. Verified with 19 vitest cases and web typecheck.

<!-- SECTION:FINAL_SUMMARY:END -->
