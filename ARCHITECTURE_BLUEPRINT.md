# Architecture Blueprint: Layer 1 & Layer 2 Implementation Guide

## Executive Summary

**Current State**: You have a perfect foundation layer already built in `packages/menuyukti`.

**Problem**: Agents in `apps/agents` are mixing deterministic logic with LangGraph graphs.

**Solution**: Stratified architecture using `menuyukti` as your Layer 1 foundation, new `logic` package as Layer 1 agents, and simplified FastAPI routes as Layer 2.

---

## Current State Analysis

### What You Already Have (Foundation - Core Data Layer)

```
packages/menuyukti/
├── src/menuyukti/core/
│   ├── inputs.py                          ← CoreInputs contract (immutable, validated)
│   ├── models/
│   │   ├── matrix_item.py                 ← Raw economic state per menu item
│   │   ├── heatmap.py                     ← Behavioral demand (hourly/weekly)
│   │   ├── matrix_distribution.py         ← Portfolio health (star/puzzle/plow/low_end)
│   │   └── sales_analytics_summary.py     ← Order & period-level context
│   └── analytics/
│       ├── calculate_menu_engineering_matrix.py
│       ├── calculate_menu_heatmaps.py
│       ├── calculate_popularity_index.py
│       ├── calculate_sales_analytics.py
│       └── registry.py                    ← Transforms POS → deterministic outputs
```

**This is NOT just data models. This is economic infrastructure.**

Each model answers a business question:

- `MatrixItem`: "What is the item's economic state?" (margin, volume, category)
- `MenuHeatmap`: "When does this item sell?" (hourly/daily patterns)
- `MatrixDistribution`: "Is our portfolio healthy?" (star/puzzle/plow/low_end split)
- `SalesAnalyticsSummary`: "What's our order context?" (avg order size, popularity index)

---

## Proposed Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Layer 3: AI Enhancement (Optional)           │
│                   src/agent/ai_context.py                        │
│  - Optional LLM calls (Memory signal, Profit headline, etc)      │
│  - Fails gracefully if LLM unavailable                           │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────────┐
│           Layer 2: Orchestration (FastAPI Routes)               │
│               src/agent/routes/                                 │
│  - Thin wrappers around Layer 1 logic                           │
│  - Validation → Compute → Optional AI → Response                │
│  - No business logic, no complexity                             │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────────┐
│         Layer 1: Agent Logic (Pure Functions)                   │
│             src/agent/logic/                                    │
│  - Deterministic business formulas                              │
│  - No frameworks, no async, no graph                            │
│  - 100% auditability for restaurant analysts                    │
└─────────────────────────────────────────────────────────────────┘
                            ▲
                            │
┌─────────────────────────────────────────────────────────────────┐
│      Core Data Layer (Foundation - ALREADY BUILT)               │
│              packages/menuyukti/                                │
│  - CoreInputs, MatrixItem, MenuHeatmap, Distribution            │
│  - Deterministic transforms (POS → matrix → heatmap)            │
│  - Contract versioning, validation                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Implementation Plan

### Layer 0: Core Data (packages/menuyukti) - UNCHANGED

**This is your foundation. Don't change it.**

```python
from menuyukti.core.inputs import CoreInputs
from menuyukti.core.models import MatrixItem, MenuHeatmap, MatrixDistribution

# Restaurant passes this to any agent
inputs: CoreInputs = CoreInputs(
    matrix_items=[MatrixItem(...), ...],  # Economic state per item
    heatmaps=[MenuHeatmap(...), ...],      # Demand patterns
    distribution=MatrixDistribution(...),  # Portfolio health
    sales_summary=SalesAnalyticsSummary(...) # Order context
)
```

### Layer 1: Agent Logic (NEW: packages/menuyukti/src/menuyukti/agents/) - REFACTORED

**IMPORTANT: All deterministic calculations move to menuyukti, not apps/agents.**

This makes menuyukti a **complete restaurant optimization toolkit**, not just data models.

**Pure functions. No frameworks. No LangGraph. Restaurant analysts can read and verify.**

Structure in menuyukti:

```
packages/menuyukti/src/menuyukti/
├── core/
│   ├── inputs.py                    ← CoreInputs (existing)
│   ├── models/                      ← Domain models (existing)
│   └── analytics/                   ← Analytics transforms (existing)
│
├── agents/                          ← NEW: Agent decision logic
│   ├── __init__.py
│   ├── consensus.py                 ← Consensus ranking by profit + volume
│   ├── simulation.py                ← What-if scenario analysis
│   ├── rerank.py                    ← Feedback-driven reranking
│   ├── release_loop.py              ← Stage-based release gating
│   ├── learning_eligibility.py      ← Learning readiness assessment
│   └── strategist.py                ← Weekly strategy scoring
│
└── features/                        ← Shared utilities
    ├── scoring.py                   ← Confidence/impact calculations
    ├── ranking.py                   ← Generic ranking logic
    ├── penalties.py                 ← Risk/penalty calculations
    └── popularity.py                ← Popularity index utilities
```

**Key**: No LangGraph imports. All logic is pure Python functions with zero framework dependencies.

#### Example 1: Consensus Logic (Layer 1)

```python
# packages/menuyukti/src/menuyukti/agents/consensus.py
"""Consensus scoring engine. 100% deterministic.

No frameworks. No LangGraph. No async. Just math.

Restaurant analyst should be able to:
1. Read this file
2. Understand every line
3. Verify it matches their business rules
"""

from dataclasses import dataclass
from menuyukti.core.models import MatrixItem
from typing import Literal

Mode = Literal["conservative", "aggressive"]

@dataclass(frozen=True)
class ConsensusScore:
    menu_item: str
    strategy_score: float
    risk_penalty: float
    final_score: float
    rank: int

def compute_strategy_score(item: MatrixItem, mode: Mode) -> float:
    """
    Strategy score = margin potential + volume power + confidence.

    Mode determines weighting:
    - conservative: trust margin more
    - aggressive: take more risk for volume
    """
    # Revenue contribution: 60% weight to margin consistency
    revenue_contribution = max(0, item.margin_per_unit)

    # Margin consistency: 40% weight to profit magnitude
    margin_component = item.contribution_margin_percentage

    # Mode adjustment
    if mode == "aggressive":
        # Aggressive: prefer volume (higher revenue_contribution weight)
        revenue_weight = 0.65
        margin_weight = 0.35
    else:
        # Conservative: prefer safety (higher margin_weight)
        revenue_weight = 0.55
        margin_weight = 0.45

    return revenue_weight * revenue_contribution + margin_weight * margin_component

def compute_risk_penalty(item: MatrixItem, mode: Mode) -> float:
    """
    Risk = item category + portfolio position + trend.

    Conservative mode penalizes low-end items heavily.
    Aggressive mode accepts more low-end items.
    """
    # Base penalty by category
    category_penalties = {
        "star": 0.0,           # No penalty for profit anchors
        "puzzle": 0.1,         # Small penalty (margin exists but unproven volume)
        "plow_horse": 0.15,    # Moderate penalty (volume without margin safety)
        "low_end": 0.4,        # High penalty (both low margin and low volume)
    }

    base_penalty = category_penalties.get(item.category, 0.0)

    # Mode-based adjustment
    if mode == "aggressive":
        # Accept more risk
        return base_penalty * 0.7
    else:
        # Higher risk aversion
        return base_penalty * 1.2

def rank_consensus_candidates(items: list[MatrixItem], mode: Mode) -> list[ConsensusScore]:
    """
    Rank items by: strategy_score - risk_penalty = final_score

    Return sorted by final_score descending.
    """
    scores = []
    for item in items:
        strategy = compute_strategy_score(item, mode)
        risk = compute_risk_penalty(item, mode)
        final = strategy - risk

        scores.append({
            "item": item,
            "strategy": round(strategy, 4),
            "risk": round(risk, 4),
            "final": round(final, 4),
        })

    # Sort by final score descending
    ranked = sorted(scores, key=lambda x: x["final"], reverse=True)

    return [
        ConsensusScore(
            menu_item=entry["item"].menu,
            strategy_score=entry["strategy"],
            risk_penalty=entry["risk"],
            final_score=entry["final"],
            rank=idx + 1,
        )
        for idx, entry in enumerate(ranked)
    ]
```

**Key characteristics:**

- ✅ No LangGraph
- ✅ No async
- ✅ No frameworks
- ✅ Restaurant analyst can read line-by-line
- ✅ Testable with simple unit tests
- ✅ Debuggable with print statements

#### Example 2: Simulation Logic (Layer 1)

```python
# apps/agents/src/agent/logic/simulation_logic.py
"""What-if scenario simulation engine."""

from dataclasses import dataclass
from menuyukti.core.models import MatrixItem

@dataclass(frozen=True)
class Scenario:
    name: str
    description: str
    baseline_impact: float
    confidence_low: float
    confidence_high: float
    recommendation_rank: int

def compute_confidence_band(item: MatrixItem, scenario_type: str) -> tuple[float, float]:
    """
    Confidence band = [low, high] estimate for scenario impact.

    Based on item stability + margin buffer.
    """
    # Base band: how stable is this item?
    stability_factor = 1.0 - (0.1 * item.quantity)  # More quantity = more stable

    if scenario_type == "pessimistic":
        # Wider band for pessimistic
        spread = 0.30 + (0.10 * stability_factor)
        return (-spread, 0)
    elif scenario_type == "optimistic":
        # Narrower band for optimistic
        spread = 0.20 - (0.05 * stability_factor)
        return (0, spread)
    else:  # moderate
        return (-0.10, 0.10)

def simulate_scenarios(
    item: MatrixItem,
    baseline_score: float
) -> list[Scenario]:
    """
    Generate 3 scenarios: pessimistic, moderate, optimistic.

    Each shows impact range + confidence level.
    """
    scenarios = []

    for scenario_type in ["pessimistic", "moderate", "optimistic"]:
        low, high = compute_confidence_band(item, scenario_type)

        scenarios.append(Scenario(
            name=scenario_type.title(),
            description=f"{scenario_type} case for {item.menu}",
            baseline_impact=baseline_score,
            confidence_low=round(baseline_score + low, 4),
            confidence_high=round(baseline_score + high, 4),
            recommendation_rank=1 if scenario_type == "moderate" else (0 if scenario_type == "pessimistic" else 2),
        ))

    return scenarios
```

### Layer 2: Orchestration (NEW: apps/agents/src/agent/routes/)

**Thin wrappers. No business logic. Just: validate → compute → enhance → return.**

Structure:

```
apps/agents/src/agent/routes/
├── __init__.py
├── consensus_route.py          ← POST /agents/consensus/debate
├── simulation_route.py          ← POST /agents/simulation/what-if
├── rerank_route.py              ← POST /agents/rerank/apply-feedback
├── release_loop_route.py        ← POST /agents/release/evaluate
└── common.py                    ← Shared response builders
```

#### Example: Consensus Route (Layer 2)

```python
# apps/agents/src/agent/routes/consensus_route.py
"""Consensus orchestration. Thin wrapper around Layer 1."""

from fastapi import APIRouter
from pydantic import BaseModel

from menuyukti.core.inputs import CoreInputs
from agent.logic.consensus_logic import rank_consensus_candidates, Mode
from agent.ai_context import enhance_consensus_with_ai  # Layer 3 (optional)

router = APIRouter()

class ConsensusRequest(BaseModel):
    """Thin request model. All business data comes from CoreInputs."""
    contract_version: str = "v1"
    mode: Mode = "conservative"
    core_inputs: CoreInputs  # ← Your foundation data

@router.post("/agents/consensus/debate")
async def consensus_debate(request: ConsensusRequest) -> dict:
    """
    1. Validate
    2. Compute (Layer 1)
    3. Optional AI enhancement (Layer 3)
    4. Return

    If LLM fails → graceful fallback.
    If Layer 1 fails → clear error.
    """

    # ✅ Validate readiness
    if request.core_inputs.sales_summary is None:
        return {
            "status": "blocked",
            "reason": "sales_summary_required",
            "llm": {"status": "skipped"},
        }

    # ✅ Layer 1: Compute rankings
    candidates = request.core_inputs.matrix_items
    rankings = rank_consensus_candidates(candidates, request.mode)

    if not rankings:
        return {
            "status": "accepted",
            "winner": None,
            "reason": "no_items_to_rank",
            "llm": {"status": "skipped"},
        }

    winner = rankings[0]

    # ✅ Layer 3: Optional AI enhancement
    llm_result = await enhance_consensus_with_ai(
        winner=winner,
        all_rankings=rankings,
    )

    # ✅ Return full observability
    return {
        "contract_version": "v1",
        "status": "accepted",
        "reason_code": "ALLOWED",
        "consensus": {
            "mode": request.mode,
            "winner": {
                "menu_item": winner.menu_item,
                "rank": winner.rank,
                "strategy_score": winner.strategy_score,
                "risk_penalty": winner.risk_penalty,
                "final_score": winner.final_score,
            },
            "recommendations": [
                {
                    "rank": r.rank,
                    "menu_item": r.menu_item,
                    "final_score": r.final_score,
                }
                for r in rankings[:5]  # Top 5
            ],
        },
        "llm": llm_result.metadata if llm_result else {"status": "skipped"},
        "explanation": llm_result.explanation if llm_result else f"Consensus selected {winner.menu_item}",
    }
```

### Layer 3: AI Enhancement (UPDATED: apps/agents/src/agent/ai_context.py)

```python
# apps/agents/src/agent/ai_context.py
"""Optional AI enhancement. Layer 3.

If LLM is available and makes sense → use it.
Otherwise → graceful degradation.
"""

import os
from typing import Optional
from dataclasses import dataclass

@dataclass
class EnhancementResult:
    explanation: str
    metadata: dict

async def enhance_consensus_with_ai(
    winner,
    all_rankings: list,
) -> Optional[EnhancementResult]:
    """
    Optional: Ask LLM for Instagram-ready explanation.

    If unavailable or disabled → return None.
    If fails → return None (no downgrade of agent status).
    """

    # Check if LLM is enabled
    if not os.getenv("AGENTS_LLM_ENABLED", "true").lower() in ["true", "1", "yes"]:
        return None

    try:
        # Build prompt
        prompt = f"""
        Menu consensus decision:
        Winner: {winner.menu_item}
        Score: {winner.final_score:.1f}

        Provide 1-sentence Instagram caption explaining why this item should be promoted.
        """

        # Call LLM (your existing runtime)
        from agent.llm_runtime import execute_llm_step
        from agent.runtime_config import get_agent_runtime_config

        runtime = get_agent_runtime_config("multi-agent-consensus")
        llm_result = execute_llm_step(
            agent_id="multi-agent-consensus",
            runtime=runtime,
            system_prompt="You are a menu marketing expert.",
            user_prompt=prompt,
            required_output_keys=("headline",),
        )

        if llm_result.status == "used":
            return EnhancementResult(
                explanation=llm_result.output.get("headline", f"Try {winner.menu_item}!"),
                metadata={
                    "status": "used",
                    "provider": llm_result.provider,
                    "latency_ms": llm_result.latency_ms,
                }
            )
        else:
            # LLM failed or was disabled → graceful fallback
            return None

    except Exception as e:
        # Any error → graceful fallback
        return None
```

---

## File Placement & Migration Strategy

### What Stays (No Changes)

```
packages/menuyukti/           ← ✅ Core data layer (FOUNDATION)
apps/agents/src/agent/        ← Keep existing:
  ├── llm_runtime.py          ← LLM abstraction
  ├── runtime_config.py       ← Config
  └── prompt_contracts.py     ← Prompt definitions
```

### What Gets Removed

```
❌ apps/agents/src/agent/consensus.py     ← Replace with Layer 1 + Layer 2
❌ apps/agents/src/agent/simulation.py    ← Replace with Layer 1 + Layer 2
❌ apps/agents/src/agent/rerank.py        ← Replace with Layer 1 + Layer 2
❌ apps/agents/src/agent/release_loop.py  ← Replace with Layer 1 + Layer 2
```

### What Gets Created

```
✅ apps/agents/src/agent/logic/
   ├── __init__.py
   ├── consensus_logic.py
   ├── simulation_logic.py
   ├── rerank_logic.py
   ├── release_loop_logic.py
   └── utils.py

✅ apps/agents/src/agent/routes/
   ├── __init__.py
   ├── consensus_route.py
   ├── simulation_route.py
   ├── rerank_route.py
   └── release_loop_route.py

✅ Update apps/agents/src/agent/api.py
   ← Import routes instead of legacy agents
```

---

## Migration Path (Phase-by-Phase)

### Phase 1: Create Layer 1 Logic Package

1. Create `src/agent/logic/` directory
2. Extract consensus formula → `consensus_logic.py`
3. Extract simulation logic → `simulation_logic.py`
4. Extract rerank logic → `rerank_logic.py`
5. Extract release_loop logic → `release_loop_logic.py`
6. Add unit tests for each module

**Time**: ~4-6 hours
**Risk**: Low (pure extraction, no API changes)

### Phase 2: Create Layer 2 Routes Package

1. Create `src/agent/routes/` directory
2. Convert consensus.py → consensus_route.py using Layer 1
3. Convert simulation.py → simulation_route.py using Layer 1
4. Convert rerank.py → rerank_route.py using Layer 1
5. Convert release_loop.py → release_loop_route.py using Layer 1

**Time**: ~6-8 hours
**Risk**: Medium (API contract changes if not careful)

### Phase 3: Update API Entry Point

1. Update `src/agent/api.py` to import routes instead of legacy agents
2. Run integration tests with `AGENTS_LLM_ENABLED=false`
3. Verify all 104 tests still pass

**Time**: ~2 hours
**Risk**: Medium (router registration)

### Phase 4: Update AI Enhancement Layer

1. Update `ai_context.py` to handle new Layer 2 responses
2. Add optional LLM enhancement to routes that need it (Memory, Profit, Strategist)
3. Verify graceful degradation when LLM is unavailable

**Time**: ~3 hours
**Risk**: Low (wrapper around existing LLM runtime)

### Phase 5: Cleanup

1. Delete old agent files (consensus.py, simulation.py, etc)
2. Update AGENT_ANALYSIS.md with new architecture
3. Update README.md with testing instructions

**Time**: ~1 hour
**Risk**: Very Low

---

## Key Principles

### 1. Restaurant Analysts Can Audit Everything

```python
# ✅ GOOD: Can read and verify
def compute_score(item):
    margin_weight = 0.6
    volume_weight = 0.4
    return margin_weight * item.margin + volume_weight * item.volume

# ❌ BAD: Black box
def compute_score(item):
    return neural_network.forward(item)
```

### 2. Layer 1 Has No Dependencies on Frameworks

```python
# ✅ GOOD: Pure Python
from menuyukti.core.models import MatrixItem
def rank_items(items: list[MatrixItem]) -> list:
    ...

# ❌ BAD: Framework dependent
from langgraph.graph import StateGraph
def rank_items_graph():
    ...
```

### 3. Layer 2 Is Just Routing

```python
# ✅ GOOD: Thin wrapper
@router.post("/consensus")
async def consensus(request: Request):
    result = compute_consensus(request.items)  # Layer 1
    ai = await enhance(result)                 # Layer 3
    return response(result, ai)                # HTTP

# ❌ BAD: Business logic in route
@router.post("/consensus")
async def consensus(request: Request):
    # Compute scores
    # Rank items
    # Apply ML model
    # ...
```

### 4. Layer 3 Enhancement Fails Gracefully

```python
# ✅ GOOD: Enhancement is optional
try:
    llm_explanation = await get_llm_explanation()
except:
    llm_explanation = None
# Agent still works and returns
return response(core_result, llm_explanation)

# ❌ BAD: Agent fails if LLM fails
try:
    llm_explanation = get_llm_explanation()
except:
    raise Error("Agent requires LLM")
```

---

## Benefits of This Architecture

| Aspect                       | Current                       | Proposed                    |
| ---------------------------- | ----------------------------- | --------------------------- |
| **Auditability**             | LangGraph (hidden state)      | Pure functions (readable)   |
| **Testing**                  | Complex graph testing         | Simple unit tests           |
| **Debugging**                | Graph state traces            | Print statements + logs     |
| **LLM Integration**          | Mixed throughout              | Explicit Layer 3            |
| **Restaurant Understanding** | "What's a LangGraph?"         | "It's just math formulas"   |
| **Team Velocity**            | Graph complexity              | Linear functions            |
| **Cost**                     | Wasted LLM calls              | Optional LLM only           |
| **Scaling**                  | Add more agents = more graphs | Add more functions = linear |

---

## Next Steps

1. **Review this blueprint** with your team
2. **Start with Phase 1** (Consensus logic extraction)
3. **Run tests continuously** to catch regressions
4. **Document as you go** (each Layer 1 module needs comments)
5. **Get restaurant analyst feedback** ("Can you read this and verify it?")

---

## Questions to Answer

1. **Should Profit Intelligence use Layer 1?**
   - Yes. Extract the matrix_action logic + confidence scoring.
   - LLM only generates the headline (Layer 3).

2. **Should Memory Context stay as LangGraph?**
   - Yes, BUT only the conditional logic part.
   - Layer 1: Compute default signal
   - Layer 3: Optional LLM override
   - Layer 2: Route that does: Layer 1 → maybe Layer 3 → return

3. **What about Strategist?**
   - Layer 1: Compute strategy (strategy scoring by category)
   - Layer 3: LLM generates headline
   - Same pattern as Profit Intelligence

4. **Should there be a Layer 0.5 (Analytics)?**
   - No. `menuyukti` is your Layer 0.
   - Agents just consume `CoreInputs` from menuyukti.

This architecture makes your system:

- **Transparent** (pure functions)
- **Auditable** (readable code)
- **Controllable** (restaurant analysts can modify weights)
- **Scalable** (add agents without complexity)
- **Trustworthy** (no hidden logic)
