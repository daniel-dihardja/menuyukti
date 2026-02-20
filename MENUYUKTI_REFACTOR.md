# menuyukti Refactor: Move All Deterministic Logic Out of LangGraph

## Direct Answer to Your Question

**Q: Does the refactoring also cover moving calculations from LangGraph graphs into menuyukti package?**

**A: No, the blueprint doesn't fully. But it should. Here's why and how.**

---

## The Problem

Currently:

```
apps/agents/src/agent/consensus.py
├── LangGraph imports
├── LLM calls mixed with logic
└── Deterministic formulas buried
```

After the blueprint:

```
apps/agents/src/agent/logic/consensus_logic.py
├── Still in apps/agents package
├── No LangGraph (good!)
└── But still not reusable outside agents
```

**Better approach**:

```
packages/menuyukti/src/menuyukti/agents/consensus.py
├── Pure Python functions (no frameworks)
├── No LangGraph
├── No LLM calls
└── Can be imported by any service
```

---

## Why Move to menuyukti

### Current Situation

```
packages/menuyukti/       ← Data models + analytics
apps/agents/              ← Business logic + LangGraph + LLM
```

Restaurant can't use your logic without the web API.

### After Refactor

```
packages/menuyukti/       ← Data models + analytics + AGENT LOGIC
apps/agents/              ← Just HTTP routing + optional AI
```

Restaurant can use your logic directly in Python/CLI/notebooks.

---

## Updated Package Structure

### menuyukti Becomes the Business Logic Layer

```
packages/menuyukti/src/menuyukti/
│
├── core/                          ← EXISTING
│   ├── inputs.py
│   ├── models/
│   └── analytics/
│
├── agents/                        ← NEW: Pure deterministic logic
│   ├── __init__.py
│   ├── consensus.py               ← def rank_consensus_candidates()
│   ├── simulation.py              ← def simulate_scenarios()
│   ├── rerank.py                  ← def apply_feedback_reranking()
│   ├── release_loop.py            ← def evaluate_release_stages()
│   ├── learning_eligibility.py    ← def assess_learning_readiness()
│   └── strategist.py              ← def compute_strategy_scores()
│
└── features/                      ← NEW: Shared utilities
    ├── __init__.py
    ├── scoring.py
    ├── ranking.py
    ├── penalties.py
    └── popularity.py
```

### apps/agents Becomes Just Routing

```
apps/agents/src/agent/
│
├── api.py                         ← FastAPI app setup
├── routes/                        ← HTTP routing only
│   ├── __init__.py
│   ├── consensus_route.py
│   ├── simulation_route.py
│   ├── rerank_route.py
│   ├── release_loop_route.py
│   └── learning_route.py
│
├── ai_context.py                  ← Optional LLM enhancement
├── runtime_config.py              ← LLM config (keep as-is)
└── prompt_contracts.py            ← Prompt definitions (keep as-is)
```

---

## Code Example: How It Changes

### Before (Current: LangGraph + Logic Mixed)

```python
# apps/agents/src/agent/consensus.py
from langgraph.graph import StateGraph
from agent.llm_runtime import execute_llm_step

def run_consensus(payload: DebateConsensusRequest):
    """Has LangGraph, has LLM calls, hard to extract."""

    # ... LangGraph setup ...

    # Deterministic logic (buried in here)
    strategy = max(0.0, item.expected_revenue_delta) * (1.15 if mode == "aggressive" else 0.95)
    risk = len(item.risk_flags) * (0.35 if mode == "aggressive" else 0.6)
    final = strategy - risk

    # LLM call (mixed with logic)
    llm_result = execute_llm_step(...)

    # Return response
    return { ... }
```

### After (Proposed: Pure Functions in menuyukti)

```python
# packages/menuyukti/src/menuyukti/agents/consensus.py
"""Pure deterministic logic. No frameworks. No LLM. No LangGraph."""

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
    """Pure math. Restaurant analyst can verify this."""
    growth = max(0, item.margin_per_unit) * (1.15 if mode == "aggressive" else 0.95)
    margin = item.contribution_margin_percentage * (0.9 if mode == "aggressive" else 1.1)
    confidence = {"high": 1.0, "medium": 0.7, "low": 0.45}.get(item.confidence, 0)
    return growth + margin + confidence

def compute_risk_penalty(item: MatrixItem, mode: Mode) -> float:
    """Pure math. Restaurant analyst can verify this."""
    category_penalties = {
        "star": 0.0,
        "puzzle": 0.1,
        "plow_horse": 0.15,
        "low_end": 0.4,
    }
    base_penalty = category_penalties.get(item.category, 0.0)
    return base_penalty * (0.7 if mode == "aggressive" else 1.2)

def rank_consensus_candidates(
    items: list[MatrixItem],
    mode: Mode
) -> list[ConsensusScore]:
    """Rank items by final_score = strategy_score - risk_penalty."""

    scores = []
    for item in items:
        strategy = compute_strategy_score(item, mode)
        risk = compute_risk_penalty(item, mode)
        final = strategy - risk

        scores.append({
            "item": item,
            "strategy": strategy,
            "risk": risk,
            "final": final,
        })

    # Sort by final score descending
    ranked = sorted(scores, key=lambda x: x["final"], reverse=True)

    return [
        ConsensusScore(
            menu_item=entry["item"].menu,
            strategy_score=round(entry["strategy"], 4),
            risk_penalty=round(entry["risk"], 4),
            final_score=round(entry["final"], 4),
            rank=idx + 1,
        )
        for idx, entry in enumerate(ranked)
    ]
```

### apps/agents Route (Thin Wrapper)

```python
# apps/agents/src/agent/routes/consensus_route.py
"""Thin wrapper. No business logic. Just validate → compute → enhance → return."""

from fastapi import APIRouter
from menuyukti.orchestration.consensus import rank_consensus_candidates  # ← Import from menuyukti
from menuyukti.core.inputs import CoreInputs
from agent.ai_context import enhance_consensus_with_ai  # Layer 3 (optional)

router = APIRouter()

@router.post("/agents/consensus/debate")
async def consensus_debate(request: dict) -> dict:
    """HTTP endpoint. Calls menuyukti logic."""

    # Validate
    if not request.get("core_inputs"):
        return {"status": "blocked", "reason": "missing_core_inputs"}

    core_inputs = CoreInputs(**request["core_inputs"])

    # Layer 1: Compute (from menuyukti, pure logic)
    rankings = rank_consensus_candidates(
        items=core_inputs.matrix_items,
        mode=request.get("mode", "conservative")
    )

    if not rankings:
        return {"status": "accepted", "winner": None, "llm": {"status": "skipped"}}

    winner = rankings[0]

    # Layer 3: Optional AI enhancement (from ai_context)
    ai = await enhance_consensus_with_ai(winner, rankings)

    # Return
    return {
        "contract_version": "v1",
        "status": "accepted",
        "winner": {
            "menu_item": winner.menu_item,
            "rank": winner.rank,
            "score": winner.final_score,
        },
        "explanation": ai.explanation if ai else f"Selected {winner.menu_item}",
        "llm": ai.metadata if ai else {"status": "skipped"},
    }
```

---

## Key Principles

### 1. menuyukti Has NO Framework Dependencies

```python
# ✅ GOOD: menuyukti/agents/consensus.py
from menuyukti.core.models import MatrixItem
def rank_consensus_candidates(items):
    ...

# ❌ BAD: Should NOT have
from langgraph import ...
from fastapi import ...
from agent.llm_runtime import ...
```

### 2. menuyukti Is Independently Usable

```python
# This should work WITHOUT apps/agents existing
from menuyukti.orchestration.consensus import rank_consensus_candidates

rankings = rank_consensus_candidates(items, mode="conservative")
print(rankings)
```

### 3. apps/agents Is Optional Consumer

```python
# apps/agents just adds HTTP wrapper + optional LLM
# If you don't need web API, use menuyukti directly
```

---

## Migration Path

### Phase 1: Create menuyukti.agents Package

```bash
mkdir -p packages/menuyukti/src/menuyukti/agents
touch packages/menuyukti/src/menuyukti/agents/__init__.py
touch packages/menuyukti/src/menuyukti/agents/consensus.py
```

### Phase 2: Extract Functions from apps/agents

For each agent (consensus, simulation, rerank, release_loop, etc):

1. Copy logic from `apps/agents/src/agent/X.py`
2. Remove ALL LangGraph imports
3. Remove ALL LLM calls (those go to Layer 3)
4. Keep only pure deterministic functions
5. Save to `packages/menuyukti/src/menuyukti/agents/X.py`

### Phase 3: Test menuyukti Logic

```bash
# Create unit tests for pure logic
packages/menuyukti/tests/agents/test_consensus.py
packages/menuyukti/tests/agents/test_simulation.py
# etc
```

### Phase 4: Update apps/agents Routes

Replace `from agent.consensus import run_consensus` with:

```python
from menuyukti.orchestration.consensus import rank_consensus_candidates
```

### Phase 5: Verify Integration Tests Pass

```bash
make integration_tests
```

---

## Benefits of menuyukti.agents

| Use Case                   | Before                      | After                                            |
| -------------------------- | --------------------------- | ------------------------------------------------ |
| **Restaurant analyst**     | Can't use logic outside web | `from menuyukti.orchestration import consensus_ranking` |
| **CLI tool**               | Would duplicate code        | `from menuyukti.orchestration import ...`               |
| **Analytics dashboard**    | Slow (HTTP calls)           | Fast (direct imports)                            |
| **Batch processing**       | 1000 HTTP calls             | Loop with direct imports                         |
| **Mobile backend**         | Code duplication            | Reuse menuyukti                                  |
| **Unit testing logic**     | Test through HTTP           | Unit test pure functions                         |
| **Framework independence** | LangGraph mixed in          | Gone entirely                                    |
| **Code readability**       | Hidden in graph logic       | Pure readable functions                          |

---

## Direct Answer: Does It Cover LangGraph Removal?

**Original Question**: "Does the refactoring also cover moving calculations from LangGraph graphs into menuyukti package?"

**Answer**:

- ❌ **No** if you put Layer 1 in `apps/agents/src/agent/logic/`
- ✅ **Yes** if you put Layer 1 in `packages/menuyukti/src/menuyukti/agents/`

**This document shows the right way**: Move everything to menuyukti.

---

## Recommendation

**Combine these two approaches**:

1. Use ARCHITECTURE_BLUEPRINT.md for the **layered thinking** (Layer 0/1/2/3)
2. Use this document for the **implementation location** (menuyukti.agents, not apps/agents/logic/)

**Result**: All deterministic logic is in menuyukti, completely free of LangGraph, reusable by any service.
