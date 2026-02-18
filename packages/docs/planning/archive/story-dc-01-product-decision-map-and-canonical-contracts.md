# STORY-DC-01: Product Decision Map and Canonical Domain Contracts

## Goal
Define canonical decision entities and field-level semantics shared by analytics pages and agent routes.

## Scope
- Define canonical entities: `DecisionContext`, `DecisionInsight`, `EvidenceRef`, `AgentRun`, `AgentOutput`
- Define required vs optional fields
- Define contract versioning rules (`v1`, `v1.x`)

## Deliverables
- Canonical contract document
- Field dictionary with type/nullable rules
- Page-to-entity mapping for retained pages

## Acceptance Criteria (DoD)
- Contract doc approved by product and engineering
- All retained decision pages mapped to canonical entities
- Agent outputs mapped to canonical evidence fields
