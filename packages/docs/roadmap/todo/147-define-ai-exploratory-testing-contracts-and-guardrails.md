# Story 147: Define AI exploratory testing contracts and guardrails

## Story Metadata
- Created Date: 2026-02-17
- Status: `todo`
- Parent: 146

## Goal
Define the mission contract, tool contract, output schema, and safety guardrails for AI-driven exploratory testing.

## Why This Matters
- Prevents non-deterministic and low-signal agent behavior.
- Standardizes findings quality and reproducibility.
- Protects destructive actions from accidental execution.

## Scope
- Define mission input schema (routes, personas, focus areas, constraints).
- Define tool action contract (navigate, click, fill, screenshot, log capture).
- Define findings schema (severity, repro steps, evidence paths, confidence).
- Define guardrails (no destructive flows, bounded step count, timeout budget).
- Define pass/fail criteria for mission completeness.

## Acceptance Criteria
- Contract docs are versioned and machine-readable.
- Agent output can be validated against schema.
- Guardrail rules explicitly block unsafe or out-of-scope operations.

## Deliverables
- Contract markdown + JSON schema files for mission and findings payloads.

## Dependencies
- Story 146.
