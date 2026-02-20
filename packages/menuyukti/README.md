# Menuyukti Package

**Restaurant Menu Optimization Toolkit - Deterministic Intelligence for Profit Maximization**

## What Is Menuyukti?

Menuyukti is a **complete restaurant menu optimization library** that turns sales data into actionable, auditable business decisions.

It is **NOT machine learning**. It is **data-driven optimization** using classical restaurant menu engineering combined with modern analytics.

### Core Purpose

Menuyukti converts raw restaurant sales data into:

1. **Economic classification** (stars, puzzles, plow horses, low-end items)
2. **Consensus recommendations** (which items to promote/improve/bundle/remove)
3. **What-if scenarios** (impact projections with confidence bands)
4. **Feedback-driven reranking** (adapt based on customer response)
5. **Release gating** (stage recommendations from shadow → canary → rollout)
6. **Strategy computation** (weekly priorities by category)

All logic is **100% deterministic**, **100% auditable**, **100% transparent**.

### Target Audience

**Primary**: Restaurant menu analysts and marketers at restaurants managing 10-1000 locations

- They need to understand EVERY decision (not trust a black box)
- They want to override and customize logic
- They need confidence to act on recommendations
- They audit for compliance and accountability

**Secondary**: Developers building restaurant optimization products

- You need battle-tested business logic you can reuse
- You don't want to reinvent menu engineering
- You need pure functions (not tied to web frameworks)
- You need deterministic outputs for reproducibility

**Tertiary**: Data scientists exploring restaurant economics

- You need clean, validated datasets
- You want to experiment with menu strategies
- You need performance benchmarks
- You value reproducibility

---

## Why Deterministic-First Is Better Than AI-First

### The Restaurant Context

Restaurants operate on **thin margins** (3-5% net profit). A wrong menu decision costs real money immediately.

### Why Deterministic Wins

| Aspect                  | AI-First                         | Deterministic-First                  |
| ----------------------- | -------------------------------- | ------------------------------------ |
| **Auditability**        | "LLM decided it"                 | "Here's the exact formula"           |
| **Override Capability** | Can't modify reasoning           | Can tune weights directly            |
| **Speed**               | Slow (LLM latency)               | Instant (local compute)              |
| **Cost**                | Expensive (LLM API)              | Free (after compute)                 |
| **Reproducibility**     | Different output each run        | Identical every time                 |
| **Explanation**         | ✓ Easy ("Here's why")            | ✓ Easy ("Here's the math")           |
| **Compliance**          | Hard to audit for regulators     | Easy to prove fairness               |
| **Personalization**     | Generic (trained on global data) | Restaurant-specific (tuned to venue) |
| **Scaling**             | $$$ per location                 | $0 per location (after first)        |

### The Real Insight

**Restaurants don't need AI to decide what to do. They have that data.**

What they need:

1. **Data clarity**: "Item X has 25% margin, Item Y has 8%"
2. **Optimization**: "Given these constraints, here's what wins"
3. **Context**: "Here's why this matters and how to implement it"
4. **Confidence**: "I understand this and can explain it to my team"

Menuyukti provides 1-2 perfectly.
Optional LLM enhancement provides 3-4.

### Example: Consensus Decision

**Deterministic approach** (menuyukti):

```
Salmon Bowl:
  - Revenue impact: +$200 (high margin item)
  - Volume trend: stable
  - Risk flags: none
  - Score: 79.2/100

Why? Formula: margin*0.6 + volume*0.4 - risk_penalty
```

Restaurant analyst reads this in 10 seconds and says:

> "Yes, Salmon Bowl is a profit anchor. This matches what I see on the floor."

They then decide: "We should promote it via Instagram to morning diners during rush."

**AI approach** (without data foundation):

```
LLM: "Salmon Bowl appears to be a strong candidate based on market trends..."
```

Restaurant analyst reads this and asks:

> "Why though? What's the actual math? How do I know this is right?"

---

## The Indicator Model (Why This Works)

Think of Menuyukti like **financial trading indicators**.

### How Financial Indicators Work

Financial traders use deterministic indicators (not AI) to make decisions:

```
Raw Data (OHLCV: Open/High/Low/Close/Volume)
    ↓
[Indicators - Deterministic Math]
    - Moving Average (trend)
    - RSI (strength index)
    - MACD (momentum)
    - Bollinger Bands (volatility)
    ↓
[Strategy Rules]
    - IF RSI < 30 THEN oversold → BUY signal
    - IF price > 200-day MA THEN uptrend → HOLD signal
    ↓
[Optional AI]
    - Predict next move (ML model)
    - Explain the decision (LLM context)
```

**Why indicators work**: They isolate specific signals (trend, momentum, volatility) so traders can reason about them independently.

### Menuyukti Uses the Same Model

```
Raw Data (POS transactions)
    ↓
[Indicators - Deterministic Calculations] ← THIS IS MENUYUKTI
    - Profit Margin Score (economic contribution)
    - Volume Trend (demand consistency)
    - Economic Classification (Star/Puzzle/Plow/Low-End)
    - Consistency Score (predictability)
    - Risk Assessment (volatility)
    ↓
[Decision Rules]
    - IF profit_score > 70 AND volume > avg THEN → PROMOTE
    - IF margin < 5% AND low_volume THEN → CONSIDER REMOVING
    - IF new_feedback > baseline THEN → RERANK
    ↓
[Optional Enhancement] ← THIS IS LAYER 3
    - Headlines: "Why this recommendation matters"
    - Signal Override: "Market changed, recalibrate indicator"
    - Implementation: "How to execute on Instagram"
```

### Why This Matters

Just like traders use indicators **directly** without AI:

- Restaurant analysts can use Menuyukti indicators **directly** without AI
- Or they can add optional AI for context and implementation guidance
- Both approaches are valid

**Restaurant analyst without AI**:

```python
from menuyukti.orchestration import consensus_ranking
rankings = consensus_ranking(items, mode="conservative")
# I understand the math, I trust it, I act on it
```

**Restaurant analyst with AI enhancement**:

```python
rankings = consensus_ranking(items, mode="conservative")
explanation = llm_enhance(rankings[0])  # Optional context
# Math + AI explanation = higher confidence + better communication
```

The indicators are the foundation. AI is optional enhancement.

---

## The Three-Layer Architecture

Menuyukti is designed to work at three levels:

### Layer 0: Core Data

- Immutable input contracts (CoreInputs)
- Validated domain models (MatrixItem, MenuHeatmap, etc)
- Deterministic analytics transforms

### Layer 1: Agent Logic (Deterministic Decisions)

```python
from menuyukti.orchestration import consensus_ranking

rankings = consensus_ranking(items, mode="conservative")
# Returns: sorted list of items with scores, ready to act on
```

**NO frameworks. NO black boxes. Pure Python functions.**

### Layer 2: Optional Enhancement (AI Context)

```python
explanation = llm_enhance(rankings[0])  # Optional
# Returns: "Promote Salmon Bowl because margin is high and volume is strong"
```

**Optional. Fails gracefully. Never required.**

---

## Primary Focus

- ✅ **Canonical analytics transforms** - POS data → business signals
- ✅ **Strict input validation** - Catch bad data early
- ✅ **Versioned output contracts** - Breaking changes are explicit
- ✅ **Deterministic decision logic** - 100% reproducible
- ✅ **Restaurant-specific tuning** - Adapt to local context
- ❌ NOT machine learning - Intentional, by design
- ❌ NOT tied to web frameworks - Reusable everywhere
- ❌ NOT a black box - Everything auditable

## Package Structure

### Core Layer (Data Models & Analytics)

- `src/menuyukti/core/inputs.py` - Canonical `CoreInputs` contract
- `src/menuyukti/core/models/` - Typed domain models (MatrixItem, MenuHeatmap, etc)
- `src/menuyukti/core/analytics/` - Deterministic analytics functions (POS → signals)
- `src/menuyukti/core/contracts/` - Versioned payload/envelope models

### Agent Layer (Decision Logic) - NEW

- `src/menuyukti/agents/` - Pure deterministic decision functions
  - `consensus.py` - Rank items by profit + volume
  - `simulation.py` - What-if scenario analysis
  - `rerank.py` - Feedback-driven reranking
  - `release_loop.py` - Stage-based release gating
  - `learning_eligibility.py` - Learning readiness assessment
  - `strategist.py` - Weekly strategy computation

### Features Layer (Shared Utilities)

- `src/menuyukti/features/` - Shared scoring, ranking, penalties
  - `scoring.py` - Confidence/impact calculations
  - `ranking.py` - Generic ranking utilities
  - `penalties.py` - Risk/penalty calculations
  - `popularity.py` - Popularity index utilities

### Infrastructure

- `scripts/perf_guardrails.py` - Performance benchmarks and regressions
- `tests/` - Unit + integration tests
- `perf/baseline_v1.json` - Performance baseline

## How to Use Menuyukti

### For Restaurant Analysts (Python Script)

```python
from menuyukti.core.inputs import CoreInputs
from menuyukti.orchestration import consensus_ranking

# Load your restaurant data
inputs = CoreInputs(
    matrix_items=[...],      # Your menu items + economics
    heatmaps=[...],          # Customer demand by hour/day
    distribution=[...],      # Portfolio health (stars/puzzles/plow/low_end)
    sales_summary=[...]      # Order context
)

# Get recommendations
rankings = consensus_ranking(
    items=inputs.matrix_items,
    mode="conservative"  # or "aggressive"
)

# Act on it
for item in rankings[:5]:
    print(f"{item.rank}. {item.menu_item}: Score {item.final_score}")
    print(f"   Margin value: {item.strategy_score}")
    print(f"   Risk: {item.risk_penalty}")
```

### For Product Teams (Web API Integration)

```python
# apps/agents/src/agent/routes/consensus_route.py
from menuyukti.orchestration import consensus_ranking  # Import pure logic
from menuyukti.core.inputs import CoreInputs

@router.post("/consensus/debate")
async def consensus(request):
    # Layer 1: Get deterministic decision from menuyukti
    rankings = consensus_ranking(
        items=request.core_inputs.matrix_items,
        mode=request.mode
    )

    # Layer 2: Optional AI enhancement (e.g., headline)
    ai_context = await enhance_with_llm(rankings[0])  # Optional

    # Return
    return {
        "winner": rankings[0],
        "explanation": ai_context.headline if ai_context else None,
        "llm": ai_context.metadata if ai_context else {"status": "skipped"},
    }
```

### For Data Scientists (Experimentation)

```python
from menuyukti.orchestration import consensus_ranking
from menuyukti.core.inputs import CoreInputs

# Experiment with different weightings
for aggressive_mode in [True, False]:
    rankings = consensus_ranking(
        items=inputs.matrix_items,
        mode="aggressive" if aggressive_mode else "conservative"
    )

    # Analyze results
    profit_items = [r for r in rankings if r.final_score > 70]
    print(f"{'Aggressive' if aggressive_mode else 'Conservative'}: {len(profit_items)} high-value items")
```

---

## Consumer Flow (Technical)

### Core Data Pipeline

1. Ingest POS data (sales transactions)
2. Run analytics transforms:
   - `calculate_menu_engineering_matrix()` - Classify items (star/puzzle/plow/low_end)
   - `calculate_menu_heatmaps()` - Analyze demand patterns (hourly/daily)
   - `calculate_sales_analytics()` - Compute order-level context
3. Build `CoreInputs` (immutable, validated)
4. Pass to downstream consumers

### Agent Decision Pipeline

1. Receive `CoreInputs` from core data layer
2. Call agent function (e.g., `consensus_ranking()`)
3. Get back deterministic recommendation + scoring
4. (Optional) Enhance with LLM for context/explanation
5. Return response with full observability

## Canonical Input Rules

`CoreInputs` enforces:

- `matrix_items`: required and non-empty.
- `heatmaps`: required and non-empty.
- `distribution`: required and unique category rows.
- `sales_summary`: optional.
- unknown fields: rejected.

Validation guarantees:

- heatmap menus must exist in matrix items.
- distribution categories cannot duplicate.
- validation failures use stable code-prefixed errors.

Normalization guarantees:

- matrix items, heatmaps, and distribution categories are sorted deterministically.

---

## The Philosophy: Why Deterministic Works for Restaurants

### Problem Statement

Restaurants have a **defined optimization problem**:

- Maximize profit margin
- Maintain order volume
- Manage risk (food cost volatility, supply chain)
- Align with customer preferences

This is **not** an open-ended problem that requires ML creativity.

### Solution: Deterministic Decision Logic

**Each agent in menuyukti solves a specific optimization problem with explicit tradeoffs:**

| Agent            | Problem                    | Solution                                | Why Deterministic            |
| ---------------- | -------------------------- | --------------------------------------- | ---------------------------- |
| **Consensus**    | "Which item to promote?"   | Score = margin + volume - risk          | Can audit each component     |
| **Simulation**   | "What if we change this?"  | Scenario analysis with confidence bands | Transparent assumptions      |
| **Rerank**       | "Adapt based on feedback?" | Boost score by success rate             | Restaurant owns the tuning   |
| **Release Loop** | "Is it ready to rollout?"  | Stage gates (shadow → canary → prod)    | Clear thresholds             |
| **Strategist**   | "Weekly priorities?"       | Score by category + opportunity         | Explainable in staff meeting |

### Advantages Over AI-First

1. **Explainability**: Restaurant manager can explain decision to staff in 30 seconds
2. **Auditability**: Compliance officer can verify fairness + legality
3. **Controllability**: Manager can adjust weights for their restaurant context
4. **Reliability**: Consistent results every run (no surprises)
5. **Cost**: No API fees, runs locally, scales infinitely
6. **Speed**: Instant results (no LLM latency)
7. **Defensibility**: If decision is wrong, you can see exactly why and fix it

### The AI Role (Optional Layer 3)

Menuyukti **includes optional AI enhancement**, but only for:

- **Headlines**: "Salmon Bowl is a profit anchor" (context, not decision)
- **Signals**: LLM can override default signal if it detects market shift
- **Implementation**: "Here's how to promote this on Instagram"

**AI never makes the core decision. It adds context and explanations.**

---

Output envelope for machine consumers is `ContractEnvelopeV1`:

- `contract_version`: `v1`
- `contract_type`: `sales_analytics` or `menu_matrix`
- `metadata`: source/pipeline metadata
- `payload`: typed domain payload

Example (`menu_matrix`):

```json
{
  "contract_version": "v1",
  "contract_type": "menu_matrix",
  "metadata": {
    "schema_version": "v1",
    "source_system": "api",
    "pipeline_run_id": "run-123",
    "ingested_at_utc": "2026-02-19T01:00:00Z",
    "quality_status": "passed"
  },
  "payload": {
    "thresholds": {
      "avg_popularity": 10.5,
      "avg_contribution_margin": 22.4,
      "total_cogs": 1000.0,
      "total_profit": 2500.0,
      "total_margin": 0.7143
    },
    "distribution": [],
    "items": []
  }
}
```

## Testing

All 191 unit tests are organized by domain and can be run with `make`:

```bash
cd packages/menuyukti

# Run all tests (190 passing)
make test

# Run specific test suites
make agent_tests       # 167 agent tests
make core_tests        # 24 core tests

# Detailed output and analysis
make test_verbose      # Double verbose output
make test_fast         # Stop on first failure
make test_coverage     # Coverage report (requires pytest-cov)
make test_stats        # Count tests by category

# Interactive/custom
make test_file         # Prompt for specific test file
make test_by_name      # TEST_NAME=pattern make test_by_name
make test_watch        # Auto-rerun on file changes (requires pytest-watch)
```

**Test organization:**

- `tests/unit/agents/` - Agent logic (consensus, simulation, rerank, etc.)
- `tests/unit/core/` - Core models, contracts, and analytics
- `tests/fixtures/` - Shared test data (matrix items, heatmaps, etc.)

**Test coverage:**

- Agent layer: 167 tests (all agent functions, edge cases, integration)
- Core layer: 24 tests (models, contracts, validators)
- Analytics: 8 integration tests (full pipeline validation)

## Commands

All commands are available via `make`. See `make help` for complete list.

Type checks:

- `make type-check` (or `uv run --project packages/menuyukti --group dev mypy src/menuyukti`)

Tests (see Testing section above):

- `make test` - Run all unit tests
- `make test_coverage` - Generate coverage report
- `make check` - Run all checks (lint + type-check + test)

For detailed uv commands:

- `uv run --project packages/menuyukti --group dev pytest tests`
- `uv run --project packages/menuyukti --group dev pytest tests/unit tests/analytics/integration tests/analytics/contract`

Performance guardrails:

- `uv run --project packages/menuyukti --group dev python scripts/perf_guardrails.py --mode report`
- `uv run --project packages/menuyukti --group dev python scripts/perf_guardrails.py --mode check`

Artifacts:

- baseline: `packages/menuyukti/perf/baseline_v1.json`
- guardrail runner: `packages/menuyukti/scripts/perf_guardrails.py`

## Extension Points

Safe extension points for new features:

- add new analytics function in `core/analytics/` with deterministic sorting and explicit tie-breaks.
- add/extend contracts under `core/contracts/v1.py` and keep adapters backward-compatible.
- extend `CoreInputs` only when consumer-facing semantics are clear and validated.

When changing contracts:

- keep old aliases in adapters where needed.
- add unit tests + integration tests for compatibility.
- update this README and story/spec references.

## Code Comment Convention

Comments are required only for non-obvious logic:

- explain business rule rationale (not line-by-line mechanics).
- explain deterministic ordering/tie-break decisions.
- explain compatibility shims and deprecation behavior.

Avoid noise comments that restate code.

## References

- Planning spec: `packages/docs/planning/SPECS.md`
- Epic: `packages/docs/planning/archive/EPIC-MENUYUKTI-PACKAGE-IMPROVEMENT/epic-menuyukti-package-improvement.md`
- Core contract references:
  - `packages/docs/contracts/DECISION_CONTRACT_V1.md`
  - `packages/docs/contracts/ANALYST_MATRIX_EXPORT_CONTRACT.md`
  - `packages/docs/contracts/HEATMAP_EXPORT_CONTRACT.md`
