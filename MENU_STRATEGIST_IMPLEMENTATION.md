# Menu Promotion Strategist - Implementation Plan

## Overview

A simple, practical agent that analyzes restaurant sales data and provides actionable menu promotion recommendations.

## Design Principles

- ✅ Start simple, iterate later
- ✅ Use existing data infrastructure
- ✅ Direct LLM call (no complex orchestration yet)
- ✅ Clear, actionable output
- ✅ Easy to test and validate

---

## Architecture

### Phase 1: MVP (Current)

```
┌─────────────┐
│ Web UI      │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────┐
│ API Route                    │
│ /api/agents/menu-strategist │
└──────┬──────────────────────┘
       │
       ↓
┌──────────────────┐
│ Analytics Data    │
│ - Matrix         │
│ - Sales metrics  │
└──────┬───────────┘
       │
       ↓
┌──────────────┐
│ LLM API      │
│ (OpenAI)     │
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│ Recommendations      │
│ - Items to promote   │
│ - Items to adjust    │
│ - Marketing angles   │
└──────────────────────┘
```

---

## Implementation Steps

### 1. API Route (`/api/agents/menu-strategist/route.ts`)

**Input Parameters:**

- `analyticsId` (required) - The analytics snapshot to analyze
- `locationId` (required) - Restaurant location context

**Data Sources:**

- Analytics matrix (revenue, quantity, margin, action)
- Heatmap data (time-based patterns)
- Location metadata

**Processing Logic:**

1. Load analytics matrix + heatmap
2. Extract top performers (high revenue + high margin)
3. Identify underperformers (low quantity or margin issues)
4. Build context for LLM
5. Call LLM with structured prompt
6. Parse and return recommendations

**Output Format:**

```typescript
{
  recommendations: {
    promote: [
      {
        menuItem: string;
        reason: string;
        marketingAngle: string;
        expectedImpact: "high" | "medium" | "low";
        confidence: number; // 0-1
      }
    ],
    adjust: [
      {
        menuItem: string;
        issue: string;
        suggestion: "pricing" | "bundling" | "promotion" | "remove";
        reason: string;
        expectedImpact: "high" | "medium" | "low";
      }
    ]
  },
  context: {
    analyticsId: number;
    locationId: number;
    period: { start: string; end: string };
    totalItems: number;
    dataQuality: "good" | "partial" | "limited";
  },
  metadata: {
    model: string;
    generatedAt: string;
    processingTimeMs: number;
  }
}
```

---

### 2. UI Page (`/app/(protected)/agents/menu-strategist/page.tsx`)

**Features:**

- Location + Analytics selector
- Simple "Analyze" button
- Results display:
  - **Promote Section**: Cards for each item to promote
  - **Adjust Section**: Cards for each item needing attention
  - Copy-friendly marketing angles
- Loading states
- Error handling

**Design:**

```
┌────────────────────────────────────────┐
│  Menu Promotion Strategist             │
├────────────────────────────────────────┤
│                                        │
│  Location: [Dropdown]                  │
│  Analytics: [Dropdown]                 │
│  [Analyze Menu] button                 │
│                                        │
├────────────────────────────────────────┤
│  📈 Items to Promote                   │
│  ┌────────────────────────────────┐   │
│  │ 🌟 Burger Special              │   │
│  │ High margin + strong sales     │   │
│  │                                │   │
│  │ Marketing angle:               │   │
│  │ "Customer favorite with 65%    │   │
│  │  profit margin"                │   │
│  │                                │   │
│  │ Expected impact: High          │   │
│  └────────────────────────────────┘   │
│                                        │
├────────────────────────────────────────┤
│  ⚠️  Items Needing Attention           │
│  ┌────────────────────────────────┐   │
│  │ Pasta Primavera                │   │
│  │ Issue: Low sales despite       │   │
│  │        good margin             │   │
│  │                                │   │
│  │ Suggestion: Bundle with drink  │   │
│  └────────────────────────────────┘   │
└────────────────────────────────────────┘
```

---

### 3. LLM Prompt (Embedded in API route)

**Prompt Structure:**

```markdown
You are a restaurant menu promotion strategist. Analyze this sales data and provide actionable recommendations.

Context:

- Location: {locationName}
- Period: {startDate} to {endDate}
- Total menu items: {count}

Sales Matrix:
{formatted matrix data with top performers and underperformers}

Your task:

1. Identify 3-5 items to actively promote (high potential, good margins)
2. Identify 2-4 items that need attention (adjustments or removal)
3. For each recommendation, provide:
   - Clear reason based on data
   - Specific marketing angle
   - Expected impact level

Output format: JSON
```

---

## Technology Stack

### Backend

- **Runtime**: Next.js API Route (Node.js)
- **LLM**: OpenAI GPT-4o-mini (fast, cost-effective)
- **Data**: Prisma ORM (existing)
- **Validation**: Zod schemas

### Frontend

- **Framework**: Next.js + React
- **Styling**: Tailwind CSS (existing)
- **UI Components**: shadcn/ui (existing)
- **State**: React hooks (useState)

---

## Environment Variables

Add to `.env`:

```bash
# OpenAI API for agent
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # Fast and cheap for MVP
```

---

## File Structure

```
apps/web/
├── app/
│   ├── (protected)/
│   │   └── agents/
│   │       └── menu-strategist/
│   │           └── page.tsx          # UI page
│   └── api/
│       └── agents/
│           └── menu-strategist/
│               └── route.ts          # API endpoint
└── lib/
    └── agents/
        └── menu-strategist.ts        # Business logic (optional)
```

---

## Testing Strategy

### Manual Testing (MVP)

1. Select location with good data
2. Choose recent analytics snapshot
3. Click "Analyze"
4. Verify recommendations make sense
5. Check response time (<5s target)

### Future: Automated Testing

- Unit tests for data parsing
- Integration tests for API route
- E2E tests for full flow

---

## Success Metrics

### Technical

- ✅ API responds in <5 seconds
- ✅ Valid JSON output
- ✅ Error handling works
- ✅ Build succeeds

### Business

- ✅ Recommendations are actionable
- ✅ Marketers can use output directly
- ✅ Data-backed insights are clear
- ✅ User understands next steps

---

## Future Enhancements (Phase 2+)

### Short-term

- [ ] Save recommendations history
- [ ] Export to CSV/PDF
- [ ] Comparison view (period over period)
- [ ] Confidence scoring refinement

### Medium-term

- [ ] Integration with Instagram scheduler
- [ ] Automated weekly digest
- [ ] A/B testing tracking
- [ ] Custom prompt templates

### Long-term

- [ ] Multi-location comparison
- [ ] Seasonal trend analysis
- [ ] Competitive benchmarking
- [ ] Predictive recommendations

---

## Dependencies

### Existing (Already Installed)

- `next` - Web framework
- `@prisma/client` - Database
- `react` - UI library
- `tailwindcss` - Styling

### New (To Install)

```bash
cd apps/web
pnpm add openai zod
```

---

## Rollout Plan

### Week 1: MVP

- [ ] Implement API route
- [ ] Implement UI page
- [ ] Manual testing
- [ ] Documentation

### Week 2: Validation

- [ ] User feedback
- [ ] Prompt tuning
- [ ] Performance optimization
- [ ] Bug fixes

### Week 3: Enhancement

- [ ] Add requested features
- [ ] Improve UI/UX
- [ ] Add history/saving
- [ ] Integration prep

---

## Risk Mitigation

| Risk                           | Impact | Mitigation                              |
| ------------------------------ | ------ | --------------------------------------- |
| LLM gives poor recommendations | High   | Add data validation, prompt engineering |
| API too slow (>10s)            | Medium | Cache results, optimize queries         |
| Insufficient data              | Medium | Add data quality checks, fallback logic |
| Cost too high                  | Low    | Use GPT-4o-mini, add rate limiting      |
| User confusion                 | Medium | Clear UI copy, examples, tooltips       |

---

## Open Questions

1. ✅ **Which LLM?** → OpenAI GPT-4o-mini (simple, reliable)
2. ✅ **Authentication?** → Reuse existing protected routes
3. ✅ **Store results?** → Not in MVP, add later if needed
4. ⏳ **Prompt version control?** → Embed in code for now, extract later
5. ⏳ **Multi-language support?** → English only for MVP

---

## Next Steps

1. **Install dependencies**: `pnpm add openai zod`
2. **Create API route**: Implement data loading + LLM call
3. **Create UI page**: Simple form + results display
4. **Test with real data**: Validate recommendations
5. **Iterate based on feedback**: Refine prompt and UI

---

## Success Criteria for MVP

- [ ] API route responds successfully
- [ ] UI displays recommendations clearly
- [ ] Recommendations are data-backed
- [ ] User can copy marketing angles
- [ ] Response time <5 seconds
- [ ] No errors in production
- [ ] User finds value in first use

---

## Estimated Effort

- **API Route**: 2-3 hours
- **UI Page**: 2-3 hours
- **Testing**: 1-2 hours
- **Documentation**: 1 hour
- **Total**: 1 day

---

## Notes

- Keep it simple - no complex state management
- Focus on actionable output, not fancy UI
- Use existing design system
- Prioritize working over perfect
- Gather feedback early and often
