# Epic: AI Agentic System (Restaurant Marketing + Menu Analytics)

## Epic ID
EPIC-AI-AGENTIC-SYSTEM

## Owner
TBD

## Status
Draft

## Problem Statement
Menuyukti already provides deterministic analytics and decision pages. The next phase is to make the AI layer materially smarter: agents should not only summarize, but orchestrate decision workflows for restaurant marketers (Instagram) and menu analysts with traceable evidence, action plans, and measurable impact.

## Goal
Design and implement an advanced AI agentic system that:
- accelerates marketer and analyst decisions
- preserves decision trust (evidence, readiness, confidence, lineage)
- improves operational execution quality (planning -> action -> measurement loop)
- establishes Menuyukti as a category-defining AI product for restaurant growth teams

## Product Ambition (Award-Winning Bar)
Menuyukti should feel like the most advanced decision copilot in restaurant marketing and menu analytics:
- strategic depth: moves from "insights viewer" to "decision operating system"
- execution depth: turns approved strategy into weekly operational plans
- trust depth: every recommendation is auditable, confidence-scored, and policy-guarded
- learning depth: system improves from outcomes, not only from prompts

The bar is not just "helpful AI". The bar is decision quality, repeatability, and measurable business lift.

## Why Advanced Agentic Matters
An advanced agentic layer creates leverage beyond static dashboards:
- converts raw insight into prioritized actions
- maintains decision continuity across pages/workflows
- reduces manual interpretation effort
- enables closed-loop learning from outcomes

## Benefit Map by Persona

### 1) Restaurant Marketer (Instagram)
Expected benefits:
- Faster weekly campaign planning from live menu-performance signals
- Better post timing and offer selection from heatmap + matrix + attribution context
- Consistent brand execution via structured draft generation and guardrails
- Clear confidence/readiness signaling before publishing actions

Concrete value outcomes:
- lower time-to-weekly content calendar
- higher consistency in promo choices across branches
- fewer low-readiness campaigns launched

### 2) Menu Analyst
Expected benefits:
- Faster detection of promote/improve/remove opportunities
- More reliable pair/combo decisions with explainable evidence
- Action ranking that balances margin, popularity, and operational constraints
- Easier weekly review package generation for stakeholders

Concrete value outcomes:
- reduced analysis-to-decision cycle time
- higher quality action lists with less manual spreadsheet work
- improved traceability from recommendation to source metrics

### 3) Operations / Leadership
Expected benefits:
- Unified decision audit trail across human and agent actions
- Better release safety through policy-driven guardrails
- Consistent contract semantics across UI, APIs, and agent outputs

Concrete value outcomes:
- fewer trust regressions
- clearer accountability for decisions and outcomes
- smoother scaling to additional agent capabilities

## Target Agentic Capability Set

### A) Decision Orchestration
- Agent can assemble multi-page context (matrix, heatmap, pairs, scheduler, attribution).
- Agent can produce prioritized action plans by persona and timeframe.
- Agent outputs include confidence/readiness and evidence references by default.
- Agent can explain tradeoffs ("promote now" vs "improve margin first") with quantified impact.

### B) Tool-Using Agent Execution
- Agents use deterministic tools over canonical data contracts.
- Tool results are structured, versioned, and auditable.
- Runtime policy controls allowed tools by persona and workflow stage.
- Planner-executor pattern: one agent plans the decision workflow, specialized tools/agents execute sub-steps.

### C) Workflow Memory and Continuity
- Persist decision context and prior recommendations by analytics scope.
- Track accepted/rejected recommendations to improve next suggestions.
- Keep memory bounded and versioned to avoid drift.
- Store "decision rationale memory" so future cycles reuse proven strategies per branch/daypart.

### D) Guardrails and Trust
- Block/downgrade output when freshness/quality/readiness is insufficient.
- Enforce minimum evidence thresholds for recommendation emission.
- Surface uncertainty explicitly (not hidden in prose).
- Enforce policy checks before high-impact actions (finalize schedule, publish package, budget shifts).

### E) Outcome Feedback Loop
- Link recommended actions to observed outcomes (attribution + sales deltas).
- Capture what worked/failed and why.
- Feed validated outcomes into future recommendation ranking.
- Rank future recommendations by expected uplift and historical execution success.

## Signature Cutting-Edge Features

### 1) Instagram Growth Strategist Agent
- Builds a weekly campaign plan with objective-based scenarios (reach, conversion, margin).
- Suggests posting windows, menu focus items, and CTA style by audience behavior and daypart.
- Produces decision packages ready for scheduler handoff with evidence and fallback options.

### 2) Menu Profit Intelligence Agent
- Generates a weekly action board (`promote`, `improve`, `bundle`, `deprioritize`) with impact forecasts.
- Uses pair/combo and margin interactions to propose high-lift, operationally realistic bundles.
- Flags risky recommendations when COGS confidence or data freshness is weak.

### 3) Multi-Agent Debate and Consensus Mode
- Strategy agent and risk agent evaluate the same plan from upside vs downside perspectives.
- System outputs a consensus recommendation plus disagreement reasons.
- User sees "why this plan won" and can choose conservative or aggressive mode.

### 4) What-If Simulation Studio
- Simulates expected outcomes for different posting cadence, promo focus, and bundle mixes.
- Compares scenarios with confidence bands and key assumptions.
- Supports branch-level experimentation before execution.

### 5) Autonomous Weekly Decision Brief
- Produces an executive-ready brief: priorities, rationale, expected impact, and next actions.
- Includes marketer view and analyst view in one shared report.
- Tracks last week's recommendation performance and closes the learning loop.

## Architecture Principles
- Deterministic data first: agents reason over canonical contracts, not ad-hoc payloads.
- Explainability default: every recommendation must be traceable.
- Human-in-the-loop MVP: agent recommends; user confirms high-impact actions.
- Contract stability: versioned interfaces for tools, outputs, and stored memories.
- Cost-aware design: cache reusable context, avoid redundant LLM calls.

## Continuous Learning System (Controlled Self-Improvement)
- Learn from outcomes, not free-form prompts:
  - recommendation -> acceptance/execution -> observed result.
- Keep a versioned learning policy:
  - changes are promoted only after offline and canary evaluation.
- Use a safe rollout lifecycle:
  - shadow mode -> canary -> full rollout.
- Preserve decision trust:
  - every learning-based rank change must be explainable and reversible.
- Enforce rollback:
  - automatically revert to baseline deterministic ranking when trust/performance thresholds drop.

## Scope (Initial Epic)

In scope:
- Agent tool contract layer and orchestration model
- Persona-specific agent workflows (marketer, analyst)
- Output schema hardening (evidence, confidence, readiness, action format)
- Decision memory + feedback primitives
- Controlled self-learning loop with policy-gated rollout
- Validation and release gates for agent behavior

Out of scope:
- Fully autonomous campaign execution without user confirmation
- Multi-channel expansion beyond Instagram-first marketer path
- Enterprise governance hardening beyond current MVP baseline

## MVP Cut Line (Must Ship vs Post-MVP)

Must Ship in this epic:
- AS-00, AS-01, AS-02, AS-03, AS-04, AS-07, AS-08
- AS-12 (Agent Studio overview and per-agent testable surfaces)
- Minimum learning foundation: AS-09 (capture only) + AS-10 (re-ranking v1)
- End-to-end marketer workflow:
  - recommendation -> scheduler -> post draft package -> attribution feedback read
- End-to-end analyst workflow:
  - recommendation board with evidence/confidence/readiness and exportable actions

Post-MVP (can slip without blocking release):
- AS-05 Multi-Agent Debate and Consensus Engine
- AS-06 Scenario Simulation and What-If Evaluation
- AS-11 full governed rollout automation beyond initial gated release

## Epic Release DoD (Pass/Fail)
- Required agent surfaces are live and stable:
  - Instagram Growth Strategist Agent
  - Menu Profit Intelligence Agent
- Legacy audience/tone entry points are removed from product surface (AS-00).
- Every agent output includes:
  - recommendation payload
  - evidence refs
  - confidence/readiness
  - lineage metadata (run/context version)
- Guardrail policy is enforced for stale/failed-quality contexts.
- Agents app integration test suites for implemented stories pass before web-app integration points are enabled.
- Required E2E suites pass for marketer and analyst critical paths.
- No P0 regressions on retained deterministic analytics pages.

## Decommission Plan Requirements (AS-00)
- Remove or hide legacy audience/tone user entry points.
- Deprecate legacy audience/tone-only API contracts.
- Keep scheduler post-draft compatibility path intact during transition.
- Add compatibility notes and migration map in docs.

## Evaluation and Sign-Off Standard
- Define fixed eval windows (historical and recent).
- Compare against deterministic baseline policy before rollout.
- Require explicit sign-off from:
  - Product (workflow quality)
  - Engineering (stability/performance)
  - Data/Analytics (evidence correctness)
- Release requires passing thresholds for:
  - actionability
  - trust/compliance
  - regression safety

## Performance and Cost Budgets (MVP)
- Agent response API p95 target: <= 1200ms excluding model generation latency.
- Context assembly p95 target: <= 500ms.
- Token/cost budget per weekly planning session must be tracked and reported.
- Cache policy required for repeated context and deterministic tool calls.

## Safety and Governance Requirements
- Tool access must be tenant-scoped and policy-gated.
- Prompt/context payloads must follow redaction/privacy-safe logging rules.
- All recommendation-affecting decisions must be auditable by run id and policy version.
- Learning-based ranking must be explainable and reversible.

## Ownership and Rollout Control
- Assign owner per milestone and story before implementation start.
- Use rollout stages:
  - internal shadow
  - canary branches
  - general availability
- Maintain rollback playbook with triggers and responsible owner.

## Product Readiness Addendum (PO/PM)

### 1) ICP and Segment Priority
- Primary ICP for first release:
  - Instagram-active restaurants with stable weekly sales uploads and at least one active marketer + one analyst/operator role.
- Segment order:
  1. single-location pilot restaurants
  2. small multi-branch groups
  3. larger multi-branch operators
- Expansion beyond this order is post-initial-release.

### 2) Jobs-To-Be-Done (JTBD)
Marketer JTBD:
- "Help me decide what to promote this week with confidence."
- "Help me build a full weekly Instagram plan quickly."
- "Help me produce usable post drafts I can approve and publish."

Analyst JTBD:
- "Help me prioritize menu actions that improve margin and sales mix."
- "Help me justify recommendations with clear evidence and risk."
- "Help me produce a weekly decision package for stakeholders."

### 3) North Star and Leading Indicators
- North Star metric:
  - Weekly decision package adoption rate per active branch.
- Leading indicators:
  - time-to-first-approved weekly plan
  - recommendation acceptance rate
  - scheduler finalize rate
  - analyst export completion rate
  - % recommendations with high-trust readiness

### 4) Feature-to-KPI Mapping Requirement
- Every AS story must define:
  - target KPI(s)
  - expected direction (+/-)
  - measurement window
  - baseline and success threshold
- Stories without KPI mapping are not implementation-ready.

### 5) UX Contract (Trust-Critical States)
- Required UX states on all agent decision surfaces:
  - empty/no data
  - loading
  - low-readiness warning
  - blocked (policy hard-stop)
  - degraded (limited confidence mode)
  - ready/approved for execution
  - post-execution feedback available
- Each state must include explicit user action guidance.

### 6) Freshness and Fallback Policy
- Define explicit freshness SLAs by workflow:
  - weekly planning context
  - scheduler execution context
  - attribution feedback context
- When freshness/quality fails:
  - downgrade or block based on policy
  - show deterministic fallback recommendation path
  - log policy reason in output metadata

### 7) Operational Readiness Requirements
- Required pre-GA operations checklist:
  - dashboard for trust, latency, and adoption metrics
  - alert thresholds and escalation owner
  - rollback SLA and trigger conditions
  - incident taxonomy for agent failures (data, policy, model, UX)

### 8) Launch and Commercialization Plan
- Release phases:
  1. internal alpha
  2. design partner beta
  3. controlled GA
- Each phase must define:
  - entry criteria
  - exit criteria
  - risk acceptance and owner sign-off

## Success Metrics
- >= 80% of agent responses are rated actionable by internal reviewers.
- >= 95% of agent outputs include contract-compliant evidence fields.
- <= 10 minutes to generate weekly marketer decision package after data readiness.
- measurable reduction in manual analyst preparation time (baseline vs post-epic).
- no P0 regressions on retained deterministic decision pages.
- measurable uplift in selected business KPIs versus baseline branch cohorts.

## KPI Targets (Initial)
- +10-20% increase in campaign-linked promoted item sales for branches using weekly agent plans.
- -40% reduction in marketer planning time from insight review to approved weekly schedule.
- -35% reduction in analyst prep time for weekly decision board creation.
- >= 90% "trustworthy output" rating from power users (marketer + analyst leads).

## Risks
- Hallucinated or weakly supported recommendations
- Over-coupling agent orchestration to unstable contracts
- Rising LLM cost from repeated context assembly
- UX complexity from too many agent options

## Mitigations
- strict tool-only data access for critical recommendations
- schema validation on all agent outputs
- policy-based caching and bounded context windows
- workflow-first UX with limited, high-value actions

## Milestones
1. M0: Legacy agent retirement (audience/tone) + migration safety checks
2. M1: Agent product blueprint and workflow map (marketer + analyst)
3. M2: Tool contracts and output schema v1
4. M3: Marketer agent workflow implementation (planning -> scheduler support)
5. M4: Analyst agent workflow implementation (action list + pairs/combo guidance)
6. M5: Feedback loop + release-gate validation

## Candidate Stories
1. Story AS-00: Legacy Audience/Tone Agent Decommission and Route Cleanup
2. Story AS-01: Agent Workflow Blueprint and Persona Journey Maps
3. Story AS-02: Agent Tool Contract v1 and Runtime Policy
4. Story AS-03: Marketer Agent (Instagram Planning Copilot)
5. Story AS-04: Analyst Agent (Menu Decision Copilot)
6. Story AS-05: Multi-Agent Debate and Consensus Engine
7. Story AS-06: Scenario Simulation and What-If Evaluation
8. Story AS-07: Agent Memory, Recommendation Tracking, and Feedback Signals
9. Story AS-08: Agent Guardrails, Evaluation Harness, and Release Gate
10. Story AS-09: Learning Data Model and Outcome Signal Capture
11. Story AS-10: Recommendation Re-Ranking from Outcome Feedback
12. Story AS-11: Safe Learning Release Loop (Shadow -> Canary -> Rollout)
13. Story AS-12: Agent Studio Overview Grid and Per-Agent Output Sandbox

### Story AS-00 Scope (Transition Story)
- remove/deprecate audience/tone agent entry points from product surface
- remove legacy contract dependencies that are not part of new agent architecture
- keep deterministic compatibility for existing scheduler post-draft flows
- add regression checks to prove no core marketer/analyst workflows are broken by removal

### Self-Learning Story Scopes (Safety-First)

#### Story AS-09 Scope
- define learning tables/events for:
  - recommendation issued
  - recommendation accepted/rejected
  - execution status
  - observed outcome deltas
- enforce branch/persona/time scoping and versioned schema fields
- add quality checks so weak/noisy outcomes are excluded from learning inputs

#### Story AS-10 Scope
- implement feedback-aware re-ranking policy for marketer/analyst recommendations
- combine baseline deterministic score with outcome-success priors
- keep explainability fields showing why ranking changed vs baseline
- add fallback path to baseline ranking when learning signal quality is low

#### Story AS-11 Scope
- add governed learning release loop:
  - shadow evaluation on historical windows
  - canary rollout for selected scopes
  - full rollout only after threshold pass
- define auto-rollback policy when trust/quality metrics degrade
- log model/policy version changes with decision-audit metadata
