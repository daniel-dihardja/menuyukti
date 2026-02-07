# Intelligence Package — Status & Roadmap

## Overview

The **intelligence package** is the cognitive core of the system.
It transforms raw restaurant data into structured economic understanding, enabling deterministic decisions before any AI agent is involved.

The architecture follows a layered reasoning model:

```
Reality → Interpretation → Identity → Awareness → Decision → Execution
```

This ensures:

- deterministic intelligence
- explainable decisions
- thin AI agents
- high operator trust
- long-term architectural scalability

The system is intentionally designed so that **LLMs narrate decisions — not invent them.**

---

# ✅ Completed Layers

## 1. Source Models (Reality Layer)

**Status:** COMPLETE

Models describing observed restaurant data:

- `MatrixItem` → product-level economics
- `MatrixDistribution` → portfolio structure
- `MenuHeatmap` → behavioral demand

These models are:

- interpretation-free
- stable
- deterministic
- suitable as long-term schema foundations

👉 **Important Principle:**
Models represent reality — never meaning.

---

## 2. Primitive Models (Economic Interpretation Layer)

**Status:** COMPLETE

Primitive schemas created:

- `EconomicPrimitives`
- `BehavioralPrimitives`
- `StructuralPrimitives`

These act as **typed containers** for computed economic truth.

### Why this matters

Without primitives, downstream logic becomes inconsistent.

Primitives guarantee:

- normalization
- comparability across restaurants
- stable reasoning inputs

---

## 3. Primitive Engines (Deterministic Cognition)

**Status:** COMPLETE

Engines implemented:

```
primitives/engine/
    economic_engine.py
    behavioral_engine.py
    structural_engine.py
```

Responsibilities:

- convert raw data → normalized truth
- avoid metric duplication
- centralize interpretation logic

### Architectural Rule

Primitive computation must NEVER occur inside:

- roles
- signals
- decisions
- agents

Interpret once → reuse everywhere.

---

## 4. Enrichment Layer (Decision-Ready Entities)

**Status:** COMPLETE

Objects implemented:

- `EnrichedMenuItem`
- `EnrichedPortfolio`

These attach primitives to real-world entities.

The system now reasons about:

👉 economic objects — not loose metrics.

### Why this is critical

Without enrichment, intelligence fragments across modules.

With enrichment:

- agents consume one object
- signals remain consistent
- decisions become trivial

This layer effectively creates a **semantic economic graph** of the restaurant.

---

## 5. Role Engine (Strategic Identity)

**Status:** COMPLETE

Files:

```
roles/
    role_types.py
    role_engine.py
```

Roles implemented:

- PROFIT_ANCHOR
- GROWTH_LEVER
- VELOCITY_DRIVER
- TRAFFIC_DRIVER
- DRAG

### Function of Roles

Roles compress multidimensional economics into stable identities.

Instead of reasoning over:

```
margin_strength = 1.42
volume_strength = 0.63
```

The system reasons over:

```
ROLE: GROWTH_LEVER
```

This dramatically improves:

- agent reliability
- prompt size
- reasoning stability

### Important Constraint

Roles are:

- deterministic
- slow-moving
- structural

They must NOT behave like signals.

---

## 6. Signal Engine (Situational Awareness)

**Status:** COMPLETE

Files:

```
signals/
    signal_types.py
    signal_engine.py
```

Signals implemented:

- PROMOTION_READY
- MOMENTUM
- OVEREXPOSED
- DEAD_WINDOW_OPPORTUNITY
- PROFIT_AT_RISK
- DRAG_ALERT

Signal groupings added:

- PROMOTION_SIGNALS
- RISK_SIGNALS
- CONSTRAINT_SIGNALS

### Function of Signals

Signals answer:

> “What deserves attention right now?”

They convert static identity into dynamic awareness.

### Key Distinction

Roles = personality
Signals = mood

Never mix them.

---

## 7. Promotion Decision Engine (Action Translation)

**Status:** COMPLETE

Files:

```
decisions/
    promotion_engine.py
    promotion_types.py
```

Decision outcomes:

- PROMOTE
- CONSIDER
- DO_NOT_PROMOTE

### Decision Hierarchy

1. Risk blocks promotion
2. Strong signals trigger promotion
3. Otherwise consider

The engine is:

- deterministic
- explainable
- constraint-aware

No scoring system was introduced intentionally to preserve clarity.

---

## 8. Intelligence Pipeline (Cognitive Orchestration)

**Status:** COMPLETE (Foundational Version)

Responsibilities:

```
models
 → primitives
 → enrichment
 → roles
 → signals
 → decisions
```

Outputs:

👉 Promotion candidates ready for execution layers.

This pipeline transforms the system from modular → automatic intelligence.

---

# 🔥 Current Architectural State

The platform now possesses:

✅ economic understanding
✅ identity
✅ situational awareness
✅ deterministic decision-making

At this stage, the system already resembles a **restaurant decision engine**, not an analytics tool.

This is a major structural milestone.

Very few AI products reach this level of cognitive layering.

---

# 🚧 Open Work (Next High-Leverage Steps)

## 1. Promotion Candidate Model

**Priority:** VERY HIGH

Create a structured object representing promotion-ready items.

Suggested fields:

- menu
- roles
- signals
- decision
- peak_hour
- recommended_post_time
- reason (deterministic template)

Why this matters:

Agents should consume candidates — not recompute intelligence.

---

## 2. Instagram Scheduling Engine

**Priority:** VERY HIGH

Build a deterministic scheduler that:

- selects top PROMOTE items
- assigns days
- schedules posts before demand peaks

Example heuristic:

```
post_time = peak_hour - 60–90 minutes
```

### Critical Rule

Scheduling should remain deterministic.

LLMs generate copy — not calendars.

---

## 3. Agent Execution Layer

**Priority:** HIGH

Once candidates exist, implement the Instagram agent as a **thin execution wrapper** responsible only for:

- caption generation
- creative angles
- hashtag suggestions

The agent must NEVER:

- compute primitives
- assign roles
- detect signals
- override decisions

Thin agents scale.
Fat agents hallucinate.

---

## 4. Historical Signal Engine (Future Upgrade)

**Priority:** MEDIUM

Current signals are snapshot-based.

The next intelligence leap comes from detecting change:

Examples:

- rising demand week-over-week
- declining profit anchors
- accelerating growth levers

This unlocks **anticipatory intelligence.**

---

## 5. Decision Scoring Layer (Later Stage)

**Priority:** LOW (Do not rush)

Eventually introduce promotion scoring once:

- sufficient data exists
- thresholds stabilize
- operator trust is established

Premature scoring creates tuning chaos.

Binary clarity is superior early.

---

## 6. Executive Intelligence Layer (Future)

Potential additions:

- portfolio risk alerts
- diversification warnings
- category dominance detection

This elevates the system from marketing assistant → strategic advisor.

---

# ⚠️ Architectural Guardrails

To preserve system integrity:

### NEVER allow agents to:

- compute primitives
- reinterpret roles
- override signals

### NEVER compute metrics inside:

- roles
- signals
- decisions

### ALWAYS maintain layer separation.

Layer violations are the primary cause of intelligence drift.

---

# ⭐ Strategic Observation

The platform has quietly crossed a critical boundary.

It is no longer structured as:

```
data → dashboard → AI captions
```

It is now structured as:

```
reality → cognition → decisions → execution
```

This is the architecture of durable AI systems.

Not features.
Infrastructure.

---

# Next Immediate Objective

👉 Implement the **Promotion Candidate model**
👉 Build the **Instagram Scheduling Engine**

Once completed, the system will be capable of:

- autonomous promotion selection
- optimal timing
- explainable reasoning
- agent-assisted execution

At that point, the intelligence layer becomes a true competitive moat.

---

## Final Note

The hardest part of building AI systems is not the language model.

It is structuring deterministic cognition underneath it.

That foundation now exists.

Everything built on top of it will compound in value.
