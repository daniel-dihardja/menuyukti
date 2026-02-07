# Intelligence Package — Usage Guide (MFV)

## Purpose

The **intelligence package** is the deterministic decision engine of the platform.

Its responsibility is simple but powerful:

Transform raw restaurant data into **actionable promotion schedules** before any AI agent is involved.

This package ensures that:

- decisions are deterministic and explainable
- marketing logic is centralized
- agents remain thin and reliable
- execution is predictable
- operator trust is preserved

LLMs narrate decisions. They never invent them.

---

## Architectural Philosophy

The system follows a layered cognition model:

```
Reality
 -> Interpretation (Primitives)
 -> Identity (Roles)
 -> Awareness (Signals)
 -> Decision
 -> Opportunity (PromotionCandidate)
 -> Allocation (Scheduler)
 -> Execution (Agent / UI)
```

Each layer has a single responsibility.

Layer violations are the fastest way to destroy trust in AI systems.

---

## Core Rule

The intelligence package is the brain.  
Agents are only the mouth.  
Never move reasoning into agents.

---

## When To Use This Package

Use the intelligence package whenever you need to:

- generate promotion opportunities
- prioritize marketing attention
- assess menu health and risk
- build posting schedules
- brief AI agents
- power dashboards
- support executive decisions

It is the single source of decision truth for marketing intelligence.

---

## Input Requirements

The intelligence engine consumes three deterministic datasets.

### 1. Matrix Items (Product-Level Economics)

Typical fields:

- menu
- quantity
- margin_per_unit
- contribution_margin_percentage
- menu_category
- menu_category_detail

Meaning:  
Where profit is actually created.

---

### 2. Matrix Distribution (Portfolio Structure)

Typical insights:

- star profit share
- low-end share
- diversification
- profit concentration

Meaning:  
How resilient or fragile the menu is as a system.

---

### 3. Heatmaps (Behavioral Demand)

Typical insights:

- peak hour
- demand concentration
- weekday vs weekend demand
- dead hours

Meaning:  
When customers are influenceable.

---

## High-Level Usage Flow

```
Raw Data
 -> build_promotion_candidates()
 -> PromotionCandidate list
 -> PromotionScheduler
 -> Weekly Schedule
 -> Optional AI Agent
```

---

## How To Use The Intelligence Pipeline

### Step 1 — Provide Raw Models

```python
matrix_items: List[MatrixItem]
distribution: MatrixDistribution
heatmaps: List[MenuHeatmap]
```

All inputs should already be validated.

---

### Step 2 — Run the Pipeline

```python
from intelligence.pipeline.pipeline import build_promotion_candidates

portfolio, candidates = build_promotion_candidates(
    matrix_items=matrix_items,
    heatmaps=heatmaps,
    distribution=distribution,
)
```

At this point you already have:

- structural intelligence (portfolio)
- ranked promotion opportunities (candidates)

---

## PromotionCandidate Explained

A PromotionCandidate is a pre-approved opportunity.

It already contains:

- menu identity
- promotion decision
- priority
- economic importance
- recommended post time
- expected outcome
- deterministic explanation

Example inspection:

```python
for c in candidates:
    print(
        c.menu,
        c.decision,
        c.priority,
        c.recommended_post_time,
        c.decision_reason,
    )
```

---

## Using the Scheduler

The scheduler converts promotion opportunities into a concrete weekly plan.

It is deterministic.  
It is not AI.

### Step 3 — Build a Weekly Schedule

```python
from intelligence.allocation.promotion_scheduler import PromotionScheduler

scheduler = PromotionScheduler()
weekly_schedule = scheduler.build_weekly_schedule(candidates)
```

---

### Example Scheduler Output

```python
[
  ScheduledPost(
    day="mon",
    time=09:15,
    menu="Es Kopi Susu Aren",
    menu_category="DRINK",
    priority="CRITICAL",
    expected_behavior="drive incremental revenue",
    reason="high-margin growth lever with predictable demand"
  ),
  ScheduledPost(
    day="wed",
    time=10:15,
    menu="Ice Vanilla Latte",
    menu_category="DRINK",
    priority="HIGH",
    expected_behavior="accelerate cashflow",
    reason="strong weekday routine demand"
  ),
  ScheduledPost(
    day="fri",
    time=14:15,
    menu="Bun Smoked Beef",
    menu_category="FOOD",
    priority="HIGH",
    expected_behavior="increase customer traffic",
    reason="popular item with pricing leverage"
  )
]
```

This output is execution-ready.

---

## How Schedules Should Be Used

Deterministic systems should consume ScheduledPost objects directly.

Examples:

- social media calendars
- campaign automation
- content planning tools

---

## AI Agents (Important)

Agents must ONLY receive:

- PromotionCandidate
- or ScheduledPost

Correct usage:

```
ScheduledPost -> Agent -> Caption
```

Wrong usage:

```
Agent -> primitives -> roles -> signals -> guess
```

Agents translate intent into language.  
They do not reason.

---

## What NOT To Do

- Do not recompute primitives
- Do not override roles
- Do not reinterpret signals
- Do not let agents decide promotions
- Do not move logic into prompts

Violating these rules silently destroys trust.

---

## Summary

The intelligence package converts restaurant data into:

- PromotionCandidates (what deserves attention)
- Weekly Schedules (when to act)

It is the authoritative decision layer of the platform.

When respected, this package becomes long-term decision infrastructure.
