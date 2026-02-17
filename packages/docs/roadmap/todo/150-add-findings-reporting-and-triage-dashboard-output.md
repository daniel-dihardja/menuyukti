# Story 150: Add findings reporting and triage dashboard output

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 146

## Goal
Generate a readable report package that helps engineering quickly triage AI-discovered issues.

## Why This Matters
- Raw logs are not sufficient for product/engineering decision-making.
- Structured triage output increases actionability and reduces noise.

## Scope
- Generate markdown/html summary from findings JSON.
- Include severity grouping (`critical/high/medium/low`) and confidence score.
- Link each finding to evidence (screenshots, logs, trace snippets).
- Add duplicate clustering by route + failure signature.

## Acceptance Criteria
- Report is generated automatically at run completion.
- Each finding includes reproducible steps and artifact links.
- Teams can triage without opening raw logs first.

## Deliverables
- Reporter module + summary template + triage-ready output docs.

## Dependencies
- Story 149.
