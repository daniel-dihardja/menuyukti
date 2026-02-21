# Menu Promotion Strategist - Quick Start Guide

## ✅ Implementation Complete

The Menu Promotion Strategist agent has been implemented with a simple, pragmatic approach.

---

## 📁 Files Created

1. **API Route**: `apps/web/app/api/agents/menu-strategist/route.ts`
   - Handles data loading from analytics
   - Formats context for LLM
   - Calls OpenAI API
   - Returns structured recommendations

2. **UI Page**: `apps/web/app/(protected)/agents/menu-strategist/page.tsx`
   - Location and analytics selectors
   - Analysis trigger button
   - Results display with copy functionality
   - Error handling

3. **Documentation**:
   - `MENU_STRATEGIST_IMPLEMENTATION.md` - Full implementation plan
   - `SETUP.md` - This file

---

## 🔧 Setup Instructions

### 1. Configure OpenAI API Key

Add to your `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...your-key-here...
OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
```

**Get your API key**: https://platform.openai.com/api-keys

### 2. Dependencies Installed

Already installed via pnpm:
- ✅ `openai` - OpenAI SDK
- ✅ `zod` - Schema validation

### 3. Verify Setup

```bash
# Check environment variables
cd apps/web
cat .env | grep OPENAI

# Build to check for errors
pnpm build

# Run dev server
pnpm dev
```

---

## 🚀 How to Use

### Step 1: Access the Agent

Navigate to: **http://localhost:3000/agents/menu-strategist**

### Step 2: Select Data

1. Choose a **Location** from dropdown
2. Choose an **Analytics Snapshot** from dropdown
3. Click **"Analyze Menu"**

### Step 3: Review Recommendations

The agent will return:

#### 📈 Items to Promote
- Menu items with high potential
- Data-backed reasons
- Ready-to-use marketing angles
- Expected impact levels
- Confidence scores

#### ⚠️ Items Needing Attention
- Underperforming items
- Clear issue descriptions
- Specific suggestions (pricing, bundling, promotion, removal)
- Expected impact of changes

### Step 4: Use the Output

- **Copy marketing angles** with one click
- Share recommendations with marketing team
- Implement suggested adjustments
- Track results over time

---

## 🧪 Testing

### Manual Test Checklist

- [ ] Load locations successfully
- [ ] Load analytics snapshots for selected location
- [ ] Submit analysis request
- [ ] Receive recommendations in <10 seconds
- [ ] View promote items with marketing angles
- [ ] View adjustment items with clear suggestions
- [ ] Copy marketing angle to clipboard
- [ ] Error handling works (no analytics ID, no matrix data, etc.)

### Test with Real Data

```bash
# Make sure you have:
1. ✅ At least one location in database
2. ✅ At least one analytics snapshot with matrix data
3. ✅ OpenAI API key configured
```

---

## 📊 Example Output

```json
{
  "recommendations": {
    "promote": [
      {
        "menuItem": "Signature Burger",
        "reason": "Top revenue generator ($1,245) with excellent 68% margin",
        "marketingAngle": "Our customer favorite - 68% of diners order it again!",
        "expectedImpact": "high",
        "confidence": 0.92
      },
      {
        "menuItem": "Caesar Salad",
        "reason": "Consistent performer with 145 orders and 55% margin",
        "marketingAngle": "Fresh and healthy - perfect for lunch rush",
        "expectedImpact": "medium",
        "confidence": 0.85
      }
    ],
    "adjust": [
      {
        "menuItem": "Pasta Primavera",
        "issue": "Low sales (12 orders) despite good 52% margin",
        "suggestion": "bundling",
        "reason": "Bundle with drink to increase visibility and trial",
        "expectedImpact": "medium"
      }
    ]
  }
}
```

---

## 🔍 Troubleshooting

### Issue: "OpenAI API key not configured"

**Solution**: Add `OPENAI_API_KEY` to your `.env` file

```bash
echo "OPENAI_API_KEY=sk-proj-your-key" >> apps/web/.env
```

### Issue: "No matrix data available"

**Solution**: Ensure the analytics snapshot has completed processing
- Check ETL jobs status
- Verify matrix materialization

### Issue: "Analysis takes too long (>30s)"

**Possible causes**:
- Large matrix data (>100 items)
- OpenAI API rate limits
- Network issues

**Solutions**:
- Use smaller date ranges for analytics
- Check OpenAI API status
- Adjust `maxDuration` in route.ts if needed

### Issue: "Recommendations don't make sense"

**Solution**: The prompt may need tuning for your data
- Check if matrix data has correct actions (promote/remove/etc)
- Verify margin percentages are realistic
- Consider adjusting the prompt in route.ts

---

## 🎯 Next Steps

### Phase 2 Enhancements (Priority Order)

1. **Save Recommendations**
   - Store in database
   - View history
   - Track implementation

2. **Export Functionality**
   - CSV export for spreadsheets
   - PDF export for reports
   - Share via email

3. **Comparison View**
   - Compare periods (week over week)
   - Track improvement
   - Measure impact

4. **Integration with Instagram Scheduler**
   - One-click scheduling
   - Auto-generate posts
   - Campaign planning

### Long-term Vision

- Multi-location comparison
- Seasonal trend detection
- A/B testing framework
- Predictive recommendations
- Competitive benchmarking

---

## 💡 Tips for Best Results

### Data Quality
- Use analytics snapshots with 30+ days of data
- Ensure COGS/margin data is accurate
- Keep menu names consistent

### Prompt Engineering
- The current prompt is tuned for general restaurants
- Customize in `route.ts` for specific cuisines
- Adjust tone for your brand voice

### Marketing Execution
- Test recommendations with small campaigns first
- Track metrics (engagement, sales lift)
- Iterate based on results

---

## 📞 Support

### Getting Help

1. **Check Logs**: Look in browser console and Next.js terminal
2. **Verify Data**: Use Prisma Studio to inspect database
3. **Test API**: Use curl or Postman to test endpoint directly

### Example API Test

```bash
# Test the endpoint directly
curl "http://localhost:3000/api/agents/menu-strategist?analyticsId=1"
```

---

## ✨ Success Metrics

### Technical KPIs
- ✅ Response time: <5 seconds (target)
- ✅ Success rate: >95%
- ✅ Data accuracy: High confidence scores

### Business KPIs
- 📊 Recommendations implemented
- 💰 Revenue impact of promoted items
- 📈 Engagement on marketing content
- ⏱️ Time saved on menu analysis

---

## 🎉 You're Ready!

The Menu Promotion Strategist is fully implemented and ready to use.

**Start here**: http://localhost:3000/agents/menu-strategist

For questions or issues, check:
- `MENU_STRATEGIST_IMPLEMENTATION.md` - Full technical details
- API route code - `apps/web/app/api/agents/menu-strategist/route.ts`
- UI code - `apps/web/app/(protected)/agents/menu-strategist/page.tsx`
