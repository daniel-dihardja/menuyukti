"""Prompt contract for LLM-driven IGPlan milestone.

All LLM-facing instructions and message assembly live here. Nodes fetch and trim
analytics data, then call the formatters below.
"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

IG_PLAN_SYSTEM = """You are an expert Instagram restaurant marketer.

Your task is to design a **recurring weekly Instagram content schedule** for one location,
grounded strictly in the analytics inputs provided.

────────────────────────────────────────────────────────────────────────
INPUT
────────────────────────────────────────────────────────────────────────
You receive a human message with:
- **Goal** — milestone goal string for this run
- **Owner notes** — optional owner-provided notes from milestone input
- **Analytics inputs** — JSON object with:
  - `goal` — same milestone goal (may be null when empty)
  - `ownerNotes` — same owner notes (may be null when empty)
  - `locationProfile` — venue identity and owner quick profile from the location page
  - `slotPerformance` — demand and timing signals per day × meal-period slot
  - `slotMenuCandidates` — ranked dish candidates per slot
  - `menuEngineeringMatrix` — star / plow_horse / puzzle portfolio (trimmed for prompt size)

Do not assume data outside this input.

Use these data sources as follows:
0. **Location profile** (`locationProfile`): venue identity and owner-provided quick profile
   from the location page. Use cuisine, positioning, tone presets, service modes, guardrails,
   and contact/link details to shape creative concepts, CTAs, and posting voice. Do not invent
   facts that contradict this profile.
1. **Venue slot strength** (`slotPerformance`): drive posting **timing**, **frequency**, and
   **format weight** (reels vs posts vs stories). Prioritize high-demand slots with hero content;
   use promotion-oriented formats in low-demand slots that need a lift.
2. **Slot promotion candidates** (`slotMenuCandidates`): pick **which dishes** to feature in each
   day × meal-period slot. Prefer top-ranked candidates whose `globalCategory` matches the slot
   `posture` and `recommendedCategories`.
3. **Menu engineering matrix** (`menuEngineeringMatrix`): use the global star / plow_horse / puzzle
   portfolio for variety across the week. Do not promote low_end items.

Rules:
- Output a **7-day weekly pattern** (monday through sunday). Use full lowercase English weekday
  names when referring to days.
- Formats must be one of: post, reel, story, carousel (hero feed formats).
- Post times must be HH:MM (24-hour), aligned with `mealPeriodHoursLabel` when available.
- Promoted dishes must be menu names from slot candidates or matrix items only — never invent dishes.
- Balance formats across the week; typical restaurants post 4–7 feed items plus stories per week.
- Ground every slot recommendation in the analytics inputs.

## Output format

Return **markdown only** — no JSON, no code fences wrapping the entire response.

Structure your plan with clear headings, for example:

### Reporting context
Brief note on the analytics period covered (from inputs).

### Weekly cadence
Posts, reels, and stories per week with a short rationale.

### Schedule strategy
2–3 sentences on the overall weekly approach.

### Weekly content plan
For each planned slot, include day, time, format, meal period, promoted menu(s),
engineering categories (star / plow_horse / puzzle), creative concept, CTA, and rationale.
Use a markdown table or bullet list — whichever reads clearer.

### Menu engineering notes (optional)
Portfolio-level insights from the matrix, if relevant.

Write in clear, actionable language a restaurant marketer can execute from directly."""

IG_PLAN_USER_TEMPLATE = """Generate a weekly Instagram schedule using ONLY menu names present in the inputs.
Return your plan as **markdown** (headings, bullet lists, and/or tables).

## Goal
{goal}

## Owner notes
{owner_notes}

## Analytics inputs
```json
{context_json}
```"""

IG_PLAN_EMPTY_RETRY_MESSAGE = (
    "Your previous response was empty. Return a complete weekly Instagram "
    "content plan in markdown with headings, cadence summary, and per-slot entries."
)

_EMPTY_OWNER_NOTES_PLACEHOLDER = "(none)"
_EMPTY_GOAL_PLACEHOLDER = "(not provided)"


def _display_goal(goal: str) -> str:
    text = goal.strip()
    return text if text else _EMPTY_GOAL_PLACEHOLDER


def _display_owner_notes(owner_notes: str) -> str:
    text = owner_notes.strip()
    return text if text else _EMPTY_OWNER_NOTES_PLACEHOLDER


def format_ig_plan_user_message(
    *,
    goal: str,
    owner_notes: str,
    context_payload: dict[str, Any],
) -> str:
    context_json = json.dumps(context_payload, ensure_ascii=False, indent=2)
    return IG_PLAN_USER_TEMPLATE.format(
        goal=_display_goal(goal),
        owner_notes=_display_owner_notes(owner_notes),
        context_json=context_json,
    )


def build_ig_plan_messages(
    *,
    goal: str,
    owner_notes: str,
    context_payload: dict[str, Any],
) -> list[BaseMessage]:
    return [
        SystemMessage(content=IG_PLAN_SYSTEM),
        HumanMessage(
            content=format_ig_plan_user_message(
                goal=goal,
                owner_notes=owner_notes,
                context_payload=context_payload,
            )
        ),
    ]


def empty_plan_retry_message() -> HumanMessage:
    return HumanMessage(content=IG_PLAN_EMPTY_RETRY_MESSAGE)
