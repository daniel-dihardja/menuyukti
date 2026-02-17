# How We Built AI + Playwright Autonomous Testing for a Real Product

> Draft for Medium publication

## TL;DR

We built an autonomous exploratory testing loop that combines:
- Playwright for deterministic browser actions and evidence capture
- AI-oriented mission contracts for structured exploration
- findings reports with reproducible steps and severity triage
- optional guarded auto-fix planning mode

The result: faster UX bug discovery, cleaner triage, and better release confidence.

## The Problem

Deterministic E2E tests are essential, but they miss a class of issues:
- confusing UX states
- layout overflow
- dead-end flows
- non-fatal runtime errors

In our case (Menuyukti, a restaurant analytics product), these issues matter because users rely on fast operational decisions:
- marketers need clear scheduler/attribution paths
- analysts need trustworthy pairs/matrix insights

## The Approach

We split testing into two lanes:

1. Deterministic release-gate E2E
- strict assertions for critical user flows
- non-negotiable for shipping

2. Autonomous exploratory runs
- mission-driven exploration on high-value routes
- screenshot + console/network evidence
- structured findings report for triage

## Architecture

Core components:
- Mission contracts (`v1`) with guardrails:
  - max steps
  - timeout budget
  - domain allowlist
  - destructive action policy
- Playwright adapter:
  - `goto`, `click`, `fill`, `waitFor`, `screenshot`
  - runtime signal collection (console/network errors)
- Mission runner:
  - deterministic run id
  - action log
  - findings JSON
  - markdown summary
- Optional auto-fix mode:
  - explicit opt-in
  - safe-category filtering
  - validation commands before publishing plan

## What We Actually Shipped

- Contracts and schemas:
  - mission schema
  - findings report schema
- Executable runner and artifact writer.
- Reference missions:
  - `/analytics/sales`
  - `/analytics/1/pairs`
  - `/analytics/1/scheduler`
  - `/analytics/1/attribution`
- CI workflow template for nightly/manual exploratory runs.
- Operator manual for team adoption.

## Example Mission

The mission defines:
- route objective
- step sequence
- constraints

Example (simplified):
1. Open `/analytics/1/pairs`
2. Wait for heading
3. Capture full-page screenshot
4. Collect runtime errors
5. Emit findings bundle

Outputs:
- `findings.json`
- `findings-summary.md`
- `action-log.json`
- screenshots

## Guardrails We Recommend

- Never allow destructive actions by default.
- Hard-cap run duration and step count.
- Enforce domain allowlist.
- Require reproducible steps for every non-info finding.
- Treat autonomous findings as triage input, not auto-merge authority.

## Lessons Learned

1. Contract-first design reduces noisy findings.
2. Artifact quality is as important as issue detection.
3. “Autonomous” still needs strict operating boundaries.
4. Keep deterministic tests and exploratory AI separate.

## Limitations

- Autonomous runs can be noisy without curated mission templates.
- LLM reasoning quality varies by prompt and context.
- Best results come from combined human + automated triage.

## Practical Setup Steps

1. Define mission and findings schemas.
2. Build Playwright adapter and runner.
3. Add route-specific mission templates.
4. Generate summary reports with evidence links.
5. Add CI schedule and artifact retention policy.
6. Add operator guide before team rollout.

## Closing

Autonomous exploratory testing is not a replacement for deterministic E2E.
It is a force multiplier for UX quality and bug discovery when implemented with contracts, evidence discipline, and guardrails.
