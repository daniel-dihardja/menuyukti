# Agent 1 — TODO List (Final, Canonical)

## Role

Convert deterministic menu analytics into a structured, semantic understanding of the restaurant.
Agent 1 must **interpret**, **summarize**, and **synthesize** — never calculate, decide, or recommend actions.

---

## 1. Input Handling

- [ ] Accept a fixed, versioned input schema
- [ ] Consume analytics as read-only data
- [ ] Validate presence of required analytics fields
- [ ] Reject incomplete or malformed analytics payloads

### Inputs include:

- [ ] menu_category_detail
- [ ] Menu Engineering Matrix results
- [ ] Heatmaps (day / hour / weekday)
- [ ] Order segment aggregations
- [ ] Trend and delta values
- [ ] Predefined categories and sub-categories (e.g. Breakfast)

---

## 2. Menu Engineering Matrix Interpretation

- [ ] Identify distribution across STAR / PUZZLE / PLOW_HORSE / DOG
- [ ] Detect dominant quadrant(s)
- [ ] Detect quadrant imbalance
- [ ] Identify notable item-level concentrations
- [ ] Summarize overall menu balance

---

## 3. Core Restaurant Strength Identification

- [ ] Identify high-performing categories
- [ ] Identify margin concentration areas
- [ ] Identify popularity concentration areas
- [ ] Extract time-based strengths (e.g. dinner-driven)
- [ ] Produce concise, data-backed strength statements

---

## 4. Structural Weakness Identification (Non-Prescriptive)

- [ ] Detect low-margin/high-volume patterns
- [ ] Detect high-margin/low-volume patterns
- [ ] Identify underperforming categories or segments
- [ ] Describe weaknesses neutrally (no fixes, no advice)

---

## 5. Sub-Category Performance Interpretation

- [ ] Aggregate performance by predefined sub-category
- [ ] Interpret revenue contribution per sub-category
- [ ] Interpret margin contribution per sub-category
- [ ] Identify time alignment per sub-category
- [ ] Summarize the functional role of each sub-category
- [ ] Never reclassify or rename sub-categories

---

## 6. Heatmap Pattern Interpretation

- [ ] Identify peak demand windows
- [ ] Identify low-activity windows
- [ ] Assess consistency vs volatility of demand
- [ ] Correlate time windows with menu performance
- [ ] Summarize temporal demand structure

---

## 7. Order Segment Interpretation

- [ ] Interpret predefined order segments
- [ ] Identify dominant segments
- [ ] Compare margin vs volume across segments
- [ ] Identify behavioral patterns per segment
- [ ] Avoid inventing or redefining segments

---

## 8. Cross-Dimensional Synthesis

- [ ] Relate menu categories to time windows
- [ ] Relate menu categories to order segments
- [ ] Detect clustering patterns (e.g. Stars at dinner)
- [ ] Detect misalignments (e.g. high-margin items off-peak)
- [ ] Produce synthesized insights spanning multiple dimensions

---

## 9. Signal & Anomaly Detection

- [ ] Identify unusual distributions
- [ ] Identify sudden trend shifts
- [ ] Flag inconsistencies between metrics
- [ ] Surface noteworthy signals without interpretation drift

---

## 10. Semantic Restaurant Profile Generation

- [ ] Produce a structured semantic profile
- [ ] Include restaurant positioning summary
- [ ] Include demand structure summary
- [ ] Include menu philosophy signals
- [ ] Ensure profile is reusable by downstream agents

---

## 11. Output Formatting

- [ ] Output strictly valid JSON
- [ ] Adhere to a fixed output schema
- [ ] Ensure human-readable phrasing
- [ ] Ensure no recommendations or actions are present
- [ ] Ensure outputs are explainable from input data

---

## 12. Guardrails (Must Enforce)

- [ ] Do NOT calculate analytics
- [ ] Do NOT invent data
- [ ] Do NOT reclassify categories or segments
- [ ] Do NOT suggest marketing actions
- [ ] Do NOT choose channels or tactics
- [ ] Do NOT generate creative content

---

## 13. Quality Checks

- [ ] Output is stable for identical input
- [ ] Output can be justified by analytics
- [ ] Output avoids speculative language
- [ ] Output uses neutral, analytical tone

---

## Definition of Done

- Agent 1 reliably produces a semantic restaurant profile
- Output is deterministic in structure
- Output is non-prescriptive
- Output can be consumed safely by Agent 2+
