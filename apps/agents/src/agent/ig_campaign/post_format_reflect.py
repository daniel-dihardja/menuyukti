"""Reflection module for the post format assignment node.

Contains the quality-review prompt, revision prompt, structured output model,
and the reflector LLM instance used by assign_post_formats.
"""

from typing import Literal

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from agent.config import LLM_MODEL


class _PostFormatReflectionResult(BaseModel):
    verdict: Literal["pass", "revise"]
    feedback: list[str] | None = None


_REFLECTION_PROMPT = """You are a senior Instagram restaurant marketing strategist \
reviewing a promotion plan for a restaurant campaign.

Your job is to evaluate whether the format assignments and item groupings will \
produce high-quality, engaging Instagram content — not just check that rules were followed.

Venue profile:
{location_summary}

Primary meal period: {primary_meal_period}
Campaign window: {date_start} to {date_end}

Menu items available for promotion:
{promotion_items}

Promotion assignments to review:
{serialized_plan}

Evaluate every criterion below. Return verdict="revise" with specific, actionable \
feedback bullets if ANY criterion clearly fails. Return verdict="pass" only when \
all criteria are met.

1. CAROUSEL COHERENCE — Each carousel grouping must tell a genuine customer-facing story. \
Items grouped only because they share a BCG category (e.g. both "puzzle") without a \
meaningful culinary or thematic link do not qualify. A good grouping has a clear angle \
a customer would recognise: weekend brunch picks, refreshing drinks for a hot day, \
chef's signatures, value meal sets. Flag any grouping that feels arbitrary or purely operational.

2. STAR ITEM STAGING — Star items are the highest-value content moments. Each star item \
on a solo post must be set up for aspirational, desire-driving content. \
Flag any star assignment whose caption_seed (if present) or carousel_narrative is \
generic, vague, or fails to highlight what makes the item special.

3. PUZZLE ITEM NARRATIVE — Puzzle items are promoted specifically to build awareness \
and demand among customers who haven't tried them. Each puzzle assignment must have \
a clear "discovery hook" — a reason for the audience to try something new. \
Flag any puzzle assignment that lacks a compelling hook in its carousel_narrative \
or that is buried in a grouping that doesn't foreground it.

4. MEAL PERIOD ALIGNMENT — The featured items should fit what customers are hungry \
for during this venue's primary meal period ({primary_meal_period}). \
Flag obvious mismatches — e.g. heavy dinner mains dominating a lunch-led venue, \
or breakfast items promoted at a dinner venue.

5. FEED VARIETY — Looking across all weeks and assignments: is there enough variety \
so the feed won't feel repetitive or relentlessly sales-heavy? \
Flag if the same menu sub-category, item type, or promotional angle dominates \
without relief, or if there are no engagement-adjacent posts mixed in.

6. DISTRIBUTION INTENT — Count the STAR / PUZZLE / PLOW_HORSE breakdown across all \
assignments. The targets are STAR ≈ 60–70%, PUZZLE ≈ 20–30%, PLOW_HORSE ≤ 10% of \
promotion slots. Flag if the actual distribution deviates materially from these \
targets or feels strategically misaligned with what the venue profile implies."""


_REVISION_PROMPT = """You are a senior Instagram restaurant marketing strategist. \
Revise the promotion format plan below based on specific reviewer feedback.

Venue profile:
{location_summary}

Primary meal period: {primary_meal_period}
Campaign window: {date_start} to {date_end}

Menu items available for promotion:
{promotion_items}

Previous promotion plan (to be improved):
{previous_plan_json}

Reviewer feedback — address every point:
{feedback}

Return an improved PostFormatPlan that resolves all feedback while respecting \
these hard rules:
- Use ONLY dates from the original slot list — do NOT invent new dates
- Return AT MOST {slot_count} assignments — never more than the available date count
- Each date may appear in at most one assignment
- "star" category items must always be format="single"
- Holiday-pinned slots must always be format="single"
- Maximum 2 carousel posts per week
- Each carousel must have 2–4 items and a carousel_narrative
- Use carousels to fit multiple items onto a single date when there are more items than dates
- Each item may appear in at most one post"""


_reflector_llm = ChatOpenAI(model=LLM_MODEL, temperature=0).with_structured_output(
    _PostFormatReflectionResult
)
