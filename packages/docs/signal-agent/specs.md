# Signal Agent — Technical Specification

## Purpose

The Signal Agent converts structured restaurant analytics into **machine-operable marketing signals** that downstream agents can use for decision-making.

It is NOT a copy generator.  
It is NOT a chatbot.

It is the **decision intelligence layer** between analytics and execution.

---

## Core Responsibility

Transform:
Analytics → Signals → Decisions → Actions

The agent answers:

> “What should the restaurant do next to increase revenue?”

---

## Design Philosophy

### Deterministic First, LLM Second

**Target composition:**

- 70–80% deterministic logic
- 20–30% LLM enrichment

Never allow an LLM to interpret raw financial metrics.

LLMs are used ONLY for:

- positioning
- marketing angle
- emotional trigger
- human-readable reasoning

Business math must remain deterministic.

---

## Inputs

### Required Data Sources

#### Menu Engineering Matrix

Example fields:

- contribution_margin
- popularity
- matrix_class (Star, Puzzle, Plow Horse, Dog)

#### Sales Trends

- rolling_7d_volume
- rolling_30d_volume
- trend_direction
- volatility

#### Exposure / Promotion Data (optional but HIGHLY recommended)

- last_promoted_at
- impressions
- campaign_count
- exposure_score

#### Heatmap Data

- hourly demand
- weekday demand
- peak windows

#### Operational Constraints (optional)

- available social slots
- marketing budget
- inventory signals
- prep complexity

---

## Outputs

The agent produces **Signals**, stored as structured objects.

### Signal Schema (Recommended)

```json
{
  "signal_id": "sig_uuid",
  "branch_id": "branch_uuid",
  "generated_at": "timestamp",

  "entity": {
    "type": "menu_item",
    "id": "item_uuid",
    "name": "Truffle Burger",
    "category": "Burger"
  },

  "signal": {
    "type": "UNDERPROMOTED_STAR",
    "direction": "PROMOTE",
    "priority_score": 0.0,
    "confidence": 0.0,
    "urgency": "LOW | MEDIUM | HIGH"
  },

  "evidence": {
    "matrix_class": "STAR",
    "contribution_margin": 8.4,
    "popularity_rank": 3,
    "trend": "UP",
    "exposure_score": 0.22,
    "heatmap_peak": ["Thu 18:00-20:00"]
  },

  "decision_context": {
    "goal": "increase_profit",
    "recommended_window": ["Wed", "Thu"],
    "recommended_channels": ["Instagram", "Stories"]
  },

  "strategy": {
    "positioning": "premium_indulgence",
    "psychological_trigger": "treat_yourself",
    "creative_hint": "close-up texture shot"
  },

  "lifecycle": {
    "status": "ACTIVE",
    "created_at": "timestamp",
    "expires_at": "timestamp",
    "repeat_condition": "sales_lift < 5%"
  }
}
```
