---
id: TASK-13
title: Organise advisor chat for agentic AI best practices
status: Done
assignee:
  - '@danieldihardja'
created_date: '2026-10-29T13:52:00Z'
updated_date: '2026-10-29T13:58:00Z'
labels:
  - agents
  - advisor
  - prompts
dependencies: []
references:
  - apps/agents/agents/core/chat/prompts/
  - apps/agents/agents/core/chat/tools_registry.py
  - apps/agents/agents/core/chat/middleware.py
  - apps/graphql/knowledge/
  - TASK-7
  - TASK-11
  - TASK-11.3
documentation:
  - backlog/docs/security/doc-1 - Chat-advisor-security-overview.md
priority: medium
type: chore
ordinal: 52000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->

General-mode advisor already has RAG (`search_knowledge`), location memory (`get_advisor_memory` / `update_advisor_memory`), chart tools, and a large composable system prompt. Guidance for _when_ to load each context source is scattered across prompt sections and tool docstrings, so the model may over-fetch (extra latency/cost) or under-fetch (weak situation briefs).

This epic reorganises advisor instructions, prompt blocks, and tool-gating so context loading follows agentic AI practice: clear retrieval policies, untrusted-data boundaries, and prompts that match what tools are actually bound — without inventing new product modes or replacing the GraphQL knowledge/memory stores already shipped in TASK-7 and TASK-11.

<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria

<!-- AC:BEGIN -->

- [x] #1 Advisor general-mode prompt and tool docs state explicit retrieval policies for knowledge RAG and location advisor memory
- [x] #2 Prompt sections for RAG and memory stay consistent with tools_registry gates (tools mentioned only when bound)
- [x] #3 Organisation changes are covered by prompt/tool tests or documented manual smoke checks for general mode
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->

1. Complete TASK-13.1 (RAG vs memory read policies + location-tool prompt gating).
2. Verify general prompt mentions search_knowledge / memory tools only when those tools are bound.
3. Confirm prompt/tool tests cover the organised policies.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->

Delivered via TASK-13.1: retrieval policies + location-tool prompt gating matching tools_registry.

<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->

Organised general advisor context-loading: concrete search_knowledge and get_advisor_memory read policies, prompts gated to bound tools, tests updated (31 related pytest passed).

<!-- SECTION:FINAL_SUMMARY:END -->
