# Agent Implementation Removal Plan

## Overview

This plan documents the complete removal of all agent implementations from both the `agents` app and the `web` app. The goal is to start from scratch with a simpler architecture.

---

## Phase 1: Agents App (Full Reset)

### Current State

- **Location**: `apps/agents/`
- **Structure**: LangGraph-based agent implementation with Python backend
- **Key Components**:
  - `src/agent/` - Agent graph implementation
  - `prompts/` - Prompt templates and versions
  - `tests/` - Agent unit and integration tests
  - `langgraph.json` - LangGraph configuration
  - `pyproject.toml` - Python dependencies

### Removal Strategy

**Option A: Delete entire app** (Recommended for clean slate)

```bash
rm -rf apps/agents/
```

**Option B: Reset to minimal structure** (Keep skeleton)

- Keep `apps/agents/` directory
- Keep `pyproject.toml` with minimal dependencies
- Remove all implementation code from `src/agent/`
- Remove all prompts from `prompts/`
- Remove all tests
- Update `langgraph.json` to minimal config

### Files to Remove/Reset

```
apps/agents/
├── src/agent/                    # DELETE - entire agent implementation
├── prompts/                      # DELETE - all prompt templates
├── tests/                        # DELETE - all tests
├── pilot/                        # DELETE - experimental code
├── scripts/                      # DELETE - evaluation scripts
├── langgraph.json                # RESET to minimal or DELETE
└── pyproject.toml                # RESET to minimal dependencies
```

---

## Phase 2: Web App - Agent Routes & API

### API Routes to Remove

**Location**: `apps/web/app/api/agents/`

```
app/api/agents/
├── strategist/route.ts           # DELETE - Instagram strategist agent
├── profit-intelligence/
│   ├── route.ts                  # DELETE - Menu profit intelligence
│   └── reranked/route.ts         # DELETE - Feedback reranker
├── consensus/route.ts            # DELETE - Multi-agent consensus
├── simulation/route.ts           # DELETE - What-if simulation
├── memory/route.ts               # DELETE - Agent memory tracker
├── release-gate/route.ts         # DELETE - Release gate logic
├── run-history/route.ts          # DELETE - Agent run history
├── learning/
│   ├── release-loop/route.ts     # DELETE - Learning release loop
│   └── events/route.ts           # DELETE - Learning events
└── evaluation/
    ├── harness/route.ts          # DELETE - LLM evaluation harness
    └── prompt-tuning/route.ts    # DELETE - Prompt tuning loop
```

**Action**: Delete entire `apps/web/app/api/agents/` directory

---

## Phase 3: Web App - Agent Pages & UI

### Pages to Remove

**Location**: `apps/web/app/(protected)/agents/`

```
app/(protected)/agents/
├── page.tsx                      # DELETE - Agents overview page
├── agent-filters.tsx             # DELETE - Agent filter component
└── [agentId]/                    # DELETE - Agent detail pages
```

**Action**: Delete entire `apps/web/app/(protected)/agents/` directory

---

## Phase 4: Web App - Agent Library Code

### Library Code to Remove

**Location**: `apps/web/lib/agents/`

```
lib/agents/
├── memory-repository.ts          # DELETE - Memory persistence
├── data-readiness.ts             # DELETE - Data readiness checks
├── release-gate.ts               # DELETE - Release gate logic
├── release-loop-repository.ts    # DELETE - Release loop persistence
├── agent-run-history.ts          # DELETE - Run history logic
├── output-compat.ts              # DELETE - Output compatibility
├── learning-repository.ts        # DELETE - Learning persistence
└── contract-schema.ts            # DELETE - Agent contract schemas
```

**Action**: Delete entire `apps/web/lib/agents/` directory

---

## Phase 5: Web App - Agent Configuration

### Configuration Files to Remove

```
apps/web/
├── lib/agents.json               # DELETE - Agent definitions registry
```

**Action**: Delete `apps/web/lib/agents.json`

---

## Phase 6: Web App - Tests & E2E

### Test Files to Remove

```
tests/lib/agents/
├── run-comparison.test.ts        # DELETE
├── selected-context.test.ts      # DELETE
├── release-gate.test.ts          # DELETE
├── agent-run-history.test.ts     # DELETE
├── sample-context.test.ts        # DELETE
└── contract-schema.test.ts       # DELETE

e2e/
├── agent-studio-overview-sandbox.e2e.ts        # DELETE
├── agent-phase2-handoff-readiness.e2e.ts       # DELETE
├── agent-llm-disabled-mechanical-mode.e2e.ts   # DELETE
└── agent-llm-runtime-availability.e2e.ts       # DELETE
```

**Actions**:

- Delete `apps/web/tests/lib/agents/` directory
- Delete all `agent-*.e2e.ts` files from `apps/web/e2e/`

---

## Phase 7: Database Schema (Optional)

### Agent-Related Tables

If agent implementations created database tables (memory, learning events, etc.), consider:

**Option A: Keep tables** (Preserve data for future reference)
**Option B: Drop tables** (Clean slate)

**Tables to Review**:

- Agent memory/context storage
- Agent run history
- Learning events
- Release loop tracking

Check `apps/web/prisma/schema.prisma` for agent-related models.

---

## Phase 8: Dependencies Cleanup

### Python Dependencies (agents app)

If keeping agents app skeleton:

```toml
# Remove from pyproject.toml
- langgraph
- langchain
- All LLM-related packages
```

### TypeScript Dependencies (web app)

Check `apps/web/package.json` for agent-specific dependencies and remove if unused elsewhere.

---

## Verification Steps

### 1. Build Checks

```bash
# Web app should build successfully
cd apps/web
pnpm build

# Agents app (if keeping skeleton)
cd apps/agents
uv sync
```

### 2. Test Suite

```bash
# Web app tests should pass
cd apps/web
pnpm test

# E2E tests should pass
pnpm test:e2e
```

### 3. Route Audit

```bash
# Check no /agents or /api/agents routes exist
grep -r "'/agents" apps/web/app
grep -r '"/agents' apps/web/app
```

### 4. Import Audit

```bash
# Check no imports from deleted lib/agents
grep -r "from.*lib/agents" apps/web
grep -r "import.*lib/agents" apps/web
```

---

## Execution Order

1. ✅ **Commit current state** (already done)
2. ⏳ **Remove agents app** (Phase 1)
3. ⏳ **Remove web app agent APIs** (Phase 2)
4. ⏳ **Remove web app agent pages** (Phase 3)
5. ⏳ **Remove web app agent library** (Phase 4)
6. ⏳ **Remove agent configuration** (Phase 5)
7. ⏳ **Remove agent tests** (Phase 6)
8. ⏳ **Review database schema** (Phase 7 - Optional)
9. ⏳ **Clean dependencies** (Phase 8)
10. ⏳ **Verify build & tests** (Phase 9)
11. ⏳ **Commit removal** (Phase 10)

---

## Rollback Plan

If removal causes unexpected issues:

1. **Git Reset**:

   ```bash
   git reset --hard HEAD~1
   ```

2. **Selective Restoration**:
   - Check git history for specific files
   - Cherry-pick needed components

---

## Post-Removal State

### What Remains

- ✅ Core web app (analytics, locations, Instagram integration)
- ✅ menuyukti package (core analytics, orchestration, indicators)
- ✅ Sample data system (recently added)
- ✅ Notebook playground

### What's Removed

- ❌ All LangGraph agent implementations
- ❌ Agent APIs and routes
- ❌ Agent UI pages
- ❌ Agent memory/learning systems
- ❌ Agent evaluation harness
- ❌ Agent contract schemas

### Ready for Fresh Start

With this removal, you'll have a clean foundation to:

- Redesign agent architecture from first principles
- Choose simpler patterns (if needed)
- Build incrementally with better abstractions
- Focus on core value delivery

---

## Estimated Effort

- **Phase 1-6**: ~15 minutes (mostly deletions)
- **Phase 7**: ~5 minutes (schema review)
- **Phase 8**: ~5 minutes (dependency cleanup)
- **Verification**: ~10 minutes (build, test, audit)
- **Total**: ~35 minutes

---

## Notes

- This is a **one-way operation** - make sure current work is committed
- Consider creating a `archive/agents-v1` branch before removal
- Review PR diff carefully before merging
- Update README.md to reflect removal
