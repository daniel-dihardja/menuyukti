# Decision Package — Usage Guide (MFV)

## Purpose

The **decision package** is the deterministic decision engine of the platform.

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
 → Interpretation (Primitives)
 → Identity (Roles)
 → Awareness (Signals)
 → Decision
 → Opportunity (PromotionCandidate)
 → Allocation (Scheduler)
 → Execution (Agent / UI)
```

Each layer has a single responsibility.

Layer violations are the fastest way to destroy trust in AI systems.

---

## Core Rule

The decision package is the brain.  
Agents are only the mouth.  
Never move reasoning into agents.

---

## When To Use This Package

Use the decision package whenever you need to:

- generate promotion opportunities
- prioritize marketing attention
- assess menu health and risk
- build posting schedules
- brief AI agents
- power dashboards
- support executive decisions

It is the single source of decision truth for marketing decision.

---

## Input Requirements

The decision engine consumes three deterministic datasets.

### 1. Matrix Items (Product-Level Economics)

Typical fields:

- menu
- menu_category
- menu_category_detail
- category (`star`, `puzzle`, `plow_horse`, `low_end`)
- action (`keep`, `reprice`, `promote`, `remove`)
- quantity
- total_revenue
- total_cogs
- margin_per_unit
- contribution_margin
- contribution_margin_percentage
- we_value

Meaning:  
Where profit is actually created.

---

### 2. Matrix Distribution (Portfolio Structure)

Matrix distribution is a list of `CategoryDistribution` entries:

- category (`star`, `puzzle`, `plow_horse`, `low_end`)
- item_share
- margin_share

Meaning:  
How resilient or fragile the menu is as a system.

---

### 3. Heatmaps (Behavioral Demand)

Typical insights:

- daily_heatmap (list of hourly demand)
- weekly_heatmap (list of weekday demand)
- reporting_period (e.g., `2025-02`)

Meaning:  
When customers are influenceable.

---

## High-Level Usage Flow

```
Raw Data
 → build_promotion_candidates()
 → PromotionCandidate list
 → PromotionScheduler
 → Weekly Schedule
 → Optional AI Agent
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
from app.marketing_engine.pipeline import build_promotion_candidates

portfolio, candidates = build_promotion_candidates(
    matrix_items=matrix_items,
    heatmaps=heatmaps,
    distribution=distribution,
)
```

At this point you already have:

- structural decision (portfolio)
- ranked promotion opportunities (candidates)

Note: menu items without a matching heatmap are skipped (behavioral data is required).

---

## PromotionCandidate Explained

A PromotionCandidate is a pre-approved opportunity.

It already contains:

- menu identity
- promotion decision (`promote`, `consider`, `do_not_promote`)
- priority (`critical`, `high`, `medium`, `low`)
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
from app.decision.allocation.promotion_scheduler import PromotionScheduler

scheduler = PromotionScheduler()
weekly_schedule = scheduler.build_weekly_schedule(candidates)
```

---

### Example Scheduler Output

```python
[
  ScheduledPost(
    day="mon",
    time="09:15:00",
    menu="Es Kopi Susu Aren",
    menu_category="DRINK",
    priority="critical",
    expected_behavior="drive incremental revenue",
    reason="high-margin growth lever with predictable demand",
    source_candidate="Es Kopi Susu Aren"
  ),
  ScheduledPost(
    day="wed",
    time="10:15:00",
    menu="Ice Vanilla Latte",
    menu_category="DRINK",
    priority="high",
    expected_behavior="accelerate cashflow",
    reason="strong weekday routine demand",
    source_candidate="Ice Vanilla Latte"
  ),
  ScheduledPost(
    day="fri",
    time="14:15:00",
    menu="Bun Smoked Beef",
    menu_category="FOOD",
    priority="high",
    expected_behavior="increase customer traffic",
    reason="popular item with pricing leverage",
    source_candidate="Bun Smoked Beef"
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
ScheduledPost → Agent → Caption
```

Wrong usage:

```
Agent → primitives → roles → signals → guess
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

The decision package converts restaurant data into:

- PromotionCandidates (what deserves attention)
- Weekly Schedules (when to act)

It is the authoritative decision layer of the platform.

When respected, this package becomes long-term decision infrastructure.
