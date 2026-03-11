"""Reflection module for the location summary planning node.

Contains the quality-review prompt, revision prompt, structured output model,
and the reflector LLM instance used by generate_location_summary.
"""

from typing import Literal

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from agent.config import LLM_MODEL


class _ReflectionResult(BaseModel):
    verdict: Literal["pass", "revise"]
    feedback: list[str] | None = None


_REFLECTION_PROMPT = """You are a quality reviewer for restaurant Instagram marketing briefs.

Restaurant: {name} ({city}, {country})

Source data snapshot:
- Operating pattern: {operating_pattern}  |  Dining focus: {dining_focus}
- Peak day (by orders): {peak_day}  |  Peak day (by revenue): {peak_revenue_day}
- Primary meal period: {primary_meal_period}
- Weekday / weekend split: {weekday_share:.0%} weekday / {weekend_share:.0%} weekend
- Average spend per order: {avg_revenue_per_order:.2f}  |  Average items per order: {avg_order_size:.1f}
- Holiday share: {holiday_share:.0%}

Generated summary to review:
{summary}

Evaluate against every criterion below. Return verdict="revise" with specific feedback bullets \
if ANY criterion fails; return verdict="pass" only when all are met.

1. All four sections are present with their exact headings: \
**Venue Identity**, **Audience Persona**, **Traffic & Timing**, **Content & Tone Signals**

2. Every factual claim is traceable to the source data snapshot above — no invented facts

3. Venue Identity explicitly states a price tier (budget / mid-range / premium) derived from \
avg spend per order ({avg_revenue_per_order:.2f}), and names the dominant dining focus

4. Audience Persona:
   (a) applies the party-size heuristic from avg items per order ({avg_order_size:.1f}): \
≤2 = solo/pairs, 3–5 = small groups, ≥6 = families/large groups
   (b) derives the copy tone from price point: high avg spend → aspirational, elevated language; \
low-to-mid avg spend → warm, accessible, everyday language

5. Traffic & Timing:
   (a) states a concrete posting window using the 1–2 hour lead-time rule tied to the primary \
meal period ({primary_meal_period}) — e.g. "post by 11 am for a lunch-led venue", not a vague recommendation
   (b) notes weekday vs weekend posting cadence implications from the revenue split \
({weekday_share:.0%} weekday / {weekend_share:.0%} weekend)
   (c) if peak order day ({peak_day}) and peak revenue day ({peak_revenue_day}) differ, \
flags this and explains what it means for promotional timing

6. Content & Tone Signals names at least two specific content angles, each tied to a concrete \
data signal (a named day, meal period, or menu category) — generic advice like "showcase your \
dishes" or "engage your audience" does not qualify

7. If holiday share is above 10%, Audience Persona or Content & Tone Signals explicitly \
acknowledges holiday-occasion sensitivity"""

_REVISION_PROMPT = """You are a senior restaurant marketing strategist. \
Revise the location summary below based on specific reviewer feedback.

{original_generation_prompt}

---
Previous draft (to be improved):
{previous_summary}

Reviewer feedback — address every point:
{feedback}

Write the improved version now, keeping the same four-section structure \
(**Venue Identity**, **Audience Persona**, **Traffic & Timing**, **Content & Tone Signals**)."""

_reflector_llm = ChatOpenAI(model=LLM_MODEL, temperature=0).with_structured_output(_ReflectionResult)
