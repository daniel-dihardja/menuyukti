# Agent 1 — Example Output (Canonical)

> This is an example of the **semantic restaurant profile** produced by Agent 1.  
> The output is **interpretative**, **non-prescriptive**, and derived entirely from deterministic analytics.

---

## Output Schema Example

```json
{
  "period": "2025-03",

  "menu_balance": {
    "matrix_distribution": {
      "STAR": 4,
      "PUZZLE": 3,
      "PLOW_HORSE": 2,
      "DOG": 1
    },
    "dominant_quadrant": "STAR",
    "summary": "Menu performance is skewed toward high-performing items with limited underperformers"
  },

  "core_strengths": [
    "Dinner items contribute the majority of revenue and margin",
    "Plant-based mains perform strongly in both popularity and profitability",
    "Demand peaks are concentrated and operationally predictable"
  ],

  "structural_weaknesses": [
    "Lunch segment shows high volume but comparatively low margins",
    "Several high-margin items exhibit inconsistent demand"
  ],

  "sub_category_insights": [
    {
      "sub_category": "BREAKFAST",
      "revenue_share": 0.31,
      "margin_share": 0.27,
      "peak_hours": ["07:30–10:30"],
      "interpretation": "Breakfast is a stable but time-constrained revenue contributor"
    },
    {
      "sub_category": "DINNER",
      "revenue_share": 0.46,
      "margin_share": 0.55,
      "peak_hours": ["18:30–21:00"],
      "interpretation": "Dinner represents the primary profit-driving sub-category"
    }
  ],

  "order_segment_insights": [
    {
      "segment": "Weekday Lunch",
      "order_share": 0.28,
      "avg_order_value": 14.2,
      "interpretation": "Volume-driven segment with limited margin contribution"
    },
    {
      "segment": "Weekend Dinner",
      "order_share": 0.44,
      "avg_order_value": 26.8,
      "interpretation": "High-value segment with strong margin performance"
    }
  ],

  "time_based_patterns": {
    "peak_windows": ["18:30–21:00"],
    "low_activity_windows": ["14:30–16:30"],
    "demand_consistency": "HIGH"
  },

  "cross_dimensional_patterns": [
    "STAR items are concentrated in Dinner and Weekend segments",
    "High-margin items underperform outside peak evening hours",
    "Breakfast items show consistent demand with limited growth headroom"
  ],

  "notable_signals": [
    "Menu performance distribution is stable compared to the previous period",
    "No significant volatility detected across major segments"
  ],

  "restaurant_identity_profile": {
    "positioning": "Dinner-focused, quality-driven restaurant",
    "operational_profile": "Predictable demand with concentrated peak windows",
    "menu_philosophy_signal": "Curated menu emphasizing high-performing items"
  }
}
```
