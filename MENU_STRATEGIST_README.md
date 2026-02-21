# Menu Promotion Strategist - Quick Reference

## ✅ Implementation Status: COMPLETE

Simple, pragmatic first agent - ready to test!

---

## 🎯 What It Does

Analyzes restaurant sales data and provides:

1. **Items to Promote** - High-potential menu items with ready-to-use marketing angles
2. **Items to Adjust** - Underperformers with specific improvement suggestions

---

## 🚀 Quick Start (3 Steps)

### 1. Add API Key

```bash
echo "OPENAI_API_KEY=sk-proj-your-key-here" >> apps/web/.env
```

### 2. Start Dev Server

```bash
cd apps/web
pnpm dev
```

### 3. Use the Agent

Open: **http://localhost:3000/agents/menu-strategist**

1. Select location
2. Select analytics snapshot
3. Click "Analyze Menu"
4. Get actionable recommendations!

---

## 📁 What Was Created

| File                                                       | Purpose                                 |
| ---------------------------------------------------------- | --------------------------------------- |
| `apps/web/app/api/agents/menu-strategist/route.ts`         | API endpoint - data loading + LLM call  |
| `apps/web/app/(protected)/agents/menu-strategist/page.tsx` | UI page - selection + results display   |
| `MENU_STRATEGIST_IMPLEMENTATION.md`                        | Full implementation plan + architecture |
| `MENU_STRATEGIST_SETUP.md`                                 | Detailed setup guide + troubleshooting  |

---

## 💡 Design Principles

✅ **Simple** - Direct API call, no complex orchestration  
✅ **Pragmatic** - Uses existing data infrastructure  
✅ **Actionable** - Clear recommendations, not just analysis  
✅ **Copy-friendly** - One-click copy of marketing angles  
✅ **Iterative** - Easy to enhance based on feedback

---

## 🔧 Technical Details

**Stack:**

- OpenAI GPT-4o-mini (fast, cost-effective)
- Next.js API Routes
- Zod validation
- Existing analytics matrix data

**Response Time:** <5 seconds target  
**Data Source:** Analytics matrix + location context  
**Output:** Structured JSON with promote/adjust recommendations

---

## 📊 Example Output

```
Items to Promote (3):
- Signature Burger
  Reason: Top revenue ($1,245) + excellent margin (68%)
  Marketing: "Our customer favorite - 68% of diners order again!"
  Impact: High | Confidence: 92%

Items Needing Attention (2):
- Pasta Primavera
  Issue: Low sales (12 orders) despite good margin
  Suggestion: Bundle with drink
  Impact: Medium
```

---

## 🎯 Next Steps

### Immediate

1. Add OpenAI API key to `.env`
2. Test with real data
3. Gather feedback from marketers

### Phase 2 (Based on Feedback)

- Save recommendation history
- Export to CSV/PDF
- Period-over-period comparison
- Integration with Instagram scheduler

---

## 📞 Need Help?

**Setup Issues**: See `MENU_STRATEGIST_SETUP.md`  
**Technical Details**: See `MENU_STRATEGIST_IMPLEMENTATION.md`  
**API Errors**: Check `.env` for OPENAI_API_KEY

---

## ✨ Key Features

- 🎯 **Data-Driven**: All recommendations backed by sales data
- 📋 **Copy-Ready**: Marketing angles ready for social media
- ⚡ **Fast**: Results in seconds
- 🎨 **Visual**: Clear cards with impact indicators
- 💬 **Clear**: Plain English explanations
- 🔄 **Simple**: No complex setup or configuration

---

**Status**: ✅ Ready to use  
**Route**: `/agents/menu-strategist`  
**Committed**: Yes (develop branch)
