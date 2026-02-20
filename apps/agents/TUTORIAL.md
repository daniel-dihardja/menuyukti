# Agent Testing & Improvement Tutorial

This tutorial walks you through testing and improving the **Memory Context Agent** (`agent-memory-tracker`), a relatively straightforward agent that summarizes recent events and provides context about recommendation states.

## Why This Agent?

The Memory Context Agent is ideal for learning because:

- **Simple I/O contract**: Takes a list of events, returns summary statistics
- **100% Deterministic**: Core functionality is pure logic—**NO LLM required**
  - Sorts events, counts accepted/rejected states, returns continuity signal
  - LLM call is optional/decorative and doesn't affect output
- **Easy to test**: Straightforward integration tests without LLM dependencies
- **Quick feedback loops**: Run tests in milliseconds, no LLM latency
- **Perfect for understanding the system**: Reveals that most agents are rule-based, not AI-driven

## Prerequisites

Ensure you have Python and project dependencies set up:

```bash
# From repo root
cd /Users/danieldihardja/dev/AI-Products/menuyukti/v3
source .venv/bin/activate  # or equivalent
```

## Part 1: Understanding the Agent

### ⚠️ Important: This Agent Uses NO AI

Before diving in, understand the architecture:

- **Actual logic** (lines 40-51 in `memory.py`):
  1. Sort events by version/timestamp
  2. Filter to `max_items`
  3. Count accepted/rejected
  4. Set `continuity_signal = "stable"` if `accepted >= rejected` else `"caution"`
- **LLM call** (lines 54-71): Optional summarization that doesn't affect the output
  - If LLM fails or returns nothing, the agent still works perfectly
  - Result is never integrated into the response

This is **not** a limitation—it's by design! The agent solves its task perfectly with deterministic logic.

### 1.1 Read the Current Implementation

Check the test file to understand the contract:

```bash
cat apps/agents/tests/integration_tests/test_memory_context_agent.py
```

**Key takeaway**: The agent accepts a list of events (with states like "accepted", "rejected") and returns a summary with counts. Pure business logic.

### 1.2 Explore the Source Code

```bash
# Find the agent implementation
find apps/agents/src -name "*memory*" -type f
```

Check the agent's logic, runtime config, and prompts:

```bash
# View the agent implementation
cat apps/agents/src/agent/api.py | grep -A 50 "/agents/memory/context"
```

Check the prompt templates:

```bash
ls -la apps/agents/prompts/agent-memory-tracker/
cat apps/agents/prompts/agent-memory-tracker/*.md  # or .txt
```

### 1.3 Review the Runtime Config

```bash
# See how this agent is configured
grep -A 10 "agent-memory-tracker\|memory" apps/agents/src/agent/runtime_config.py
```

## Part 2: Running Tests Locally

### 2.1 Run All Memory Context Agent Tests

```bash
# From repo root
uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_memory_context_agent.py -v
```

**Expected output**: All tests pass ✓

### 2.2 Run with Verbose Output and Coverage

```bash
# Show which test cases ran and any failures
uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_memory_context_agent.py -v -s
```

The `-s` flag shows print statements (useful for debugging).

### 2.3 Run a Single Test Case

```bash
# Test just one scenario
uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_memory_context_agent.py::test_memory_context_summarizes_recent_events -v
```

## Part 3: Starting the Server (Optional) - Without LLM

To test the agent via HTTP API **without LLM overhead**:

```bash
# Terminal 1: Start the FastAPI server with LLM disabled
export AGENTS_LLM_ENABLED=false
uv run --project apps/agents uvicorn agent.api:app --app-dir apps/agents/src --host 127.0.0.1 --port 8001
```

**Why disable LLM?**

- Faster responses (no LLM latency)
- No API key needed
- Deterministic results (perfect for testing)
- Shows that the agent works independently of LLM

Then visit:

- **Interactive docs**: http://127.0.0.1:8001/docs
- **ReDoc**: http://127.0.0.1:8001/redoc

Test via curl:

```bash
curl -X POST http://127.0.0.1:8001/agents/memory/context \
  -H "Content-Type: application/json" \
  -d '{
    "contract_version": "v1",
    "location_id": 1,
    "analytics_id": 12,
    "max_items": 5,
    "events": [
      {
        "id": "m-1",
        "version": 1,
        "recommendation_id": "rec-a",
        "source_agent_id": "menu-profit-intelligence",
        "state": "accepted",
        "created_at": "2026-02-18T10:00:00.000Z"
      }
    ]
  }' | jq .
```

## Part 4: Adding a New Test Case

### 4.1 Create a Test Scenario

Let's add a test for edge cases (e.g., empty events list):

```bash
# Open the test file
nano apps/agents/tests/integration_tests/test_memory_context_agent.py
```

Add this test case at the end:

```python
def test_memory_context_handles_empty_events() -> None:
    """Test that empty event list is handled gracefully."""
    response = client.post(
        "/agents/memory/context",
        json={
            "contract_version": "v1",
            "location_id": 1,
            "analytics_id": 12,
            "max_items": 5,
            "events": [],
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "accepted"
    assert body["memory_context"]["accepted_count"] == 0
    assert body["memory_context"]["rejected_count"] == 0
```

### 4.2 Run Your New Test

```bash
uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_memory_context_agent.py::test_memory_context_handles_empty_events -v
```

**What to expect**:

- If it passes ✓: The agent already handles empty events correctly!
- If it fails ✗: You found a regression—fix the agent code to handle edge cases.

## Part 5: Improving the Agent (Add Real Logic)

**Since this agent is 100% deterministic, improvements should add real functionality, not just tweak a prompt.**

### 5.1 Add Timestamp Tracking (Real Improvement)

Edit `apps/agents/src/agent/memory.py` to calculate actual event timestamps:

```python
def build_memory_context(payload: MemoryContextRequest) -> dict:
    # ... existing code ...

    # NEW: Calculate most recent timestamps
    most_recent_accepted = None
    most_recent_rejected = None
    for event in recent:
        if event.state == "accepted" and not most_recent_accepted:
            most_recent_accepted = event.created_at
        elif event.state == "rejected" and not most_recent_rejected:
            most_recent_rejected = event.created_at

    # ... rest of code ...
    return {
        # ... existing fields ...
        "memory_context": {
            "location_id": payload.location_id,
            "analytics_id": payload.analytics_id,
            "continuity_signal": continuity_signal,
            "accepted_count": accepted,
            "rejected_count": rejected,
            "most_recent_accepted": most_recent_accepted,  # NEW
            "most_recent_rejected": most_recent_rejected,  # NEW
            "recent_events": [event.model_dump() for event in recent],
        },
        "llm": llm.to_public_dict(),
    }
```

### 5.2 Add Test for the New Logic

```python
def test_memory_context_tracks_recent_timestamps() -> None:
    """Test that agent tracks most recent event timestamps."""
    response = client.post(
        "/agents/memory/context",
        json={
            "contract_version": "v1",
            "location_id": 1,
            "analytics_id": 12,
            "max_items": 10,
            "events": [
                {
                    "id": "m-1",
                    "version": 1,
                    "recommendation_id": "rec-a",
                    "source_agent_id": "menu-profit-intelligence",
                    "state": "accepted",
                    "created_at": "2026-02-18T10:00:00.000Z",
                },
                {
                    "id": "m-2",
                    "version": 2,
                    "recommendation_id": "rec-b",
                    "source_agent_id": "menu-profit-intelligence",
                    "state": "rejected",
                    "created_at": "2026-02-18T10:20:00.000Z",
                },
                {
                    "id": "m-3",
                    "version": 3,
                    "recommendation_id": "rec-c",
                    "source_agent_id": "consensus",
                    "state": "accepted",
                    "created_at": "2026-02-18T10:10:00.000Z",
                },
            ],
        },
    )

    assert response.status_code == 200
    body = response.json()
    # Verify timestamps are tracked
    assert body["memory_context"]["most_recent_accepted"] == "2026-02-18T10:00:00.000Z"
    assert body["memory_context"]["most_recent_rejected"] == "2026-02-18T10:20:00.000Z"
```

### 5.3 Run Tests

```bash
# Test your implementation
uv run --project apps/agents pytest apps/agents/tests/integration_tests/test_memory_context_agent.py -v
```

### 5.4 Understanding the LLM-Optional Architecture

Notice: The LLM call in the agent doesn't affect the response. The continuity signal and counts are computed **before** the LLM call (lines 40-51), and the LLM result is never checked.

This is the current design—LLM calls are infrastructure placeholders. To use the LLM meaningfully, you would need to:

1. Move decision logic into the LLM prompt
2. Parse LLM output and use it to override/enhance the response

For now, focus on improving the **deterministic logic**. 3. Verify the prompt version is correctly wired in `runtime_config.py`

## Part 6: Using the Evaluation Harness

Once you're confident in your improvements, run the deterministic evaluation:

```bash
# Run mock-mode evaluation for this agent
uv run --project apps/agents python apps/agents/scripts/run_llm_evaluation_harness.py \
  --mode mock \
  --agent agent-memory-tracker \
  --fail-on-fail
```

**What this does**:

- Executes fixed scenarios against your agent
- Uses mocked LLM (deterministic)
- Reports pass/fail per scenario
- Writes report: `apps/agents/eval-artifacts/llm-evaluation-latest.json`
- Exits with code 1 if any scenario fails

## Part 7: Iterating with Prompt Tuning

If you want to systematically improve the agent prompt:

```bash
# Run prompt tuning loop (mock mode)
uv run --project apps/agents python apps/agents/scripts/run_prompt_tuning_loop.py \
  --mode mock \
  --agent agent-memory-tracker \
  --fail-on-unapproved
```

**What this does**:

- Tests multiple prompt versions
- Scores them against fixed scenarios
- Approves the best-performing version
- Writes report: `apps/agents/eval-artifacts/prompt-tuning-loop-latest.json`

Optional: Persist the approved version:

```bash
uv run --project apps/agents python apps/agents/scripts/run_prompt_tuning_loop.py \
  --mode mock \
  --agent agent-memory-tracker \
  --fail-on-unapproved \
  --write-freeze-map
```

This updates `apps/agents/prompts/PROMPT_VERSION_FREEZE_V1.json` for release.

## Part 8: Running the Full Test Suite

Once you're confident, run all integration tests to ensure no regressions:

```bash
# All integration tests
uv run --project apps/agents pytest apps/agents/tests/integration_tests -v

# Or just the mandatory baseline gate
make -C apps/agents mocked_baseline_tests
```

## Checklist for Completion

- [ ] Read the README and understood agent architecture
- [ ] Ran existing tests successfully
- [ ] Started the API server and tested via HTTP
- [ ] Added at least one new test case
- [ ] Enhanced the prompt with improvements
- [ ] Updated tests to verify enhancements
- [ ] Ran evaluation harness in mock mode
- [ ] All tests pass without regressions
- [ ] (Optional) Froze improved prompt version

## Next Steps

- **Other agents**: Apply this workflow to more complex agents like `marketer-strategist` or `multi-agent-consensus`
- **Live testing**: Set `AGENTS_LLM_PROVIDER=openai` with API key for real LLM evaluation
- **Debug failures**: Use `-s` flag to see print statements and understand why tests fail
- **Performance profiling**: Add timing checks to ensure improvements don't slow down the agent

## Common Issues

### Tests fail with "module not found"

```bash
# Ensure virtual env is activated and dependencies are installed
source .venv/bin/activate
uv sync --project apps/agents
```

### API server won't start

```bash
# Check if port 8001 is in use
lsof -i :8001

# Kill existing process if needed
kill -9 <PID>
```

### Changes to prompt aren't reflected in tests

```bash
# Verify the prompt version is correctly mapped in runtime_config.py
# The freeze map or env var might be overriding your changes
grep -r "agent-memory-tracker" apps/agents/src/agent/runtime_config.py
```

## Resources

- Agent contracts: `packages/docs/contracts/AGENT_*.md`
- Prompt freeze map: `apps/agents/prompts/PROMPT_VERSION_FREEZE_V1.json`
- Runtime config: `apps/agents/src/agent/runtime_config.py`
- API entry point: `apps/agents/src/agent/api.py`

---

## 📊 Important: Agent Architecture Reality Check

**See [AGENT_ANALYSIS.md](../../AGENT_ANALYSIS.md) in the repo root for a comprehensive analysis of all agents.**

**TL;DR**: All agents in this system are primarily **deterministic with optional LLM decoration**:

- ✅ **Memory Context**: 100% deterministic (no LLM needed)
- ✅ **Profit Intelligence**: 100% deterministic rules
- ✅ **Consensus**: Threshold-based scoring + ranking
- ✅ **What-If Simulation**: Formula-based simulation
- ✅ **Reranker**: Deterministic feedback boost calculation
- ✅ **Release Loop**: Threshold-based gating
- ✅ **Learning Eligibility**: Rule-based filtering
- ✅ **Strategist**: Passthrough of upstream suggestions

**LLM calls exist but are not integrated into decision logic.** They're infrastructure placeholders for future enhancement.

### What This Means for You

1. **Testing is fast & deterministic** - Run agents without LLM overhead
2. **Improvements focus on logic, not prompts** - Add real features to the code
3. **No AI magic yet** - These are sophisticated analytics, not AI agents
4. **Future opportunity** - Move decision logic into LLM prompts for true AI-driven agents
