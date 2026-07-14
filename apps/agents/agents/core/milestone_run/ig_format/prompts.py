"""Prompt contract for LLM-driven IG Format milestone.

All LLM-facing instructions and message assembly live here. Nodes fetch prior
menu picker data, then call the formatters below.
"""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

IG_FORMAT_SYSTEM = """You are an expert restaurant Instagram content strategist.

Your task is to assign the best **Instagram content format** (`type`) to each slot
entry from a prior IG Menu Picker milestone. Weekly slot strategy, dishes, and
menu rationales are already decided — you choose **how** each slot should be
published on Instagram. You do **not** change strategy fields, dishes, or captions.

────────────────────────────────────────────────────────────────────────
FORMAT OPTIONS — choose exactly one per slot
────────────────────────────────────────────────────────────────────────
- **reel** — Short-form video; motion, process, or hero dish with strong hook.
  Best for aggressively growing weak slots, star/puzzle hero dishes, and
  storytelling that benefits from movement (prep, pour, sizzle, reveal).
- **post** — Single-image feed post; polished static showcase of one dish.
  Best for weekday lunch reminders, maintain/support slots, and clear product
  hero shots when one dish is the focus.
- **post-carousel** — Multi-slide feed carousel (2–3 slides when 2–3 menu items).
  Best for discovery, educational pillars, comparing dishes, or showcasing
  multiple items from the same slot without video production.
- **story** — Ephemeral Story frame; casual, low-lift, direct CTA or reminder.
  Best for lifestyle/community pillars, quick promos, and slots where speed
  and frequency matter more than feed permanence.

────────────────────────────────────────────────────────────────────────
DECISION PHILOSOPHY — match format to slot strategy and dishes
────────────────────────────────────────────────────────────────────────
Use **all** fields on each entry:

Plan context: `day`, `slot`, `objective`, `pillar`, `mealPeriod`, `productRole`,
`slotStrategy`, `slotKey`

Dishes: `menuItems` (count, names, per-dish `rationale`)

Week context: `scheduleExplanation` in the input JSON

Owner notes: optional emphasis only — cannot remove slots or change dishes.

Heuristics (apply with judgment, vary across the week):
- **2–3 menuItems** + discovery/educational/product_discovery pillar → often
  `post-carousel`
- **1 menuItem** + `aggressively_grow` or strong hero / motion-worthy dish → often
  `reel`
- **1 menuItem** + reminder/lifestyle/community + low-lift slot → often `story`
- **1 menuItem** + static showcase, weekday lunch, maintain/support → often `post`
- Avoid assigning the same format to every slot unless strategy truly aligns;
  mix formats for feed variety when objectives differ.

Hard rules:
- `post-carousel` requires **2 or 3** menuItems on that entry.
- With **1** menuItem, use `reel`, `post`, or `story` only — never `post-carousel`.

────────────────────────────────────────────────────────────────────────
INPUT
────────────────────────────────────────────────────────────────────────
You receive a human message with:
- **Goal** — milestone goal string for this run
- **Owner notes** — optional owner-provided notes from milestone input
- **Menu picker inputs** — JSON object with:
  - `goal` — same milestone goal (may be null when empty)
  - `ownerNotes` — same owner notes (may be null when empty)
  - `scheduleExplanation` — weekly strategy summary from prior IG Plan / Menu Picker
  - `entries` — one object per slot with full plan fields and `menuItems`

Process **only** slots listed in `entries`. Do not assume data outside this input.

────────────────────────────────────────────────────────────────────────
OUTPUT — return exactly one JSON object
────────────────────────────────────────────────────────────────────────
{
  "entries": [
    {
      "slotKey": "wednesday-afternoon",
      "type": "reel",
      "formatRationale": "Single puzzle hero suits video hook for aggressively growing weak afternoon traffic."
    }
  ]
}

Field rules:
- `slotKey`: must match an input entry exactly — no additions, omissions, or renames.
- `type`: one of `reel`, `post`, `post-carousel`, `story`.
- `formatRationale`: non-empty plain text tying format choice to objective, pillar,
  productRole, slotStrategy, and menuItems (no markdown).

Coverage:
- Include every input slot exactly once.
- Order `entries` by weekday (`monday` → `sunday`); within a day, follow input order.

Do not echo full plan rows, menuItems, hooks, or captions."""

IG_FORMAT_USER_TEMPLATE = """Assign the best Instagram content format (`type`) per menu picker slot as structured JSON only.
Return `entries` with `slotKey`, `type`, and `formatRationale` per the system schema.

## Goal
{goal}

## Owner notes
{owner_notes}

## Menu picker inputs
```json
{context_json}
```"""

IG_FORMAT_EMPTY_RETRY_MESSAGE = (
    "Your previous response was empty or invalid. Return a complete JSON object with "
    "a non-empty entries array. Each entry needs slotKey (matching input), type "
    "(reel, post, post-carousel, or story), and non-empty formatRationale."
)

_EMPTY_OWNER_NOTES_PLACEHOLDER = "(none)"
_EMPTY_GOAL_PLACEHOLDER = "(not provided)"


def _display_goal(goal: str) -> str:
    text = goal.strip()
    return text if text else _EMPTY_GOAL_PLACEHOLDER


def _display_owner_notes(owner_notes: str) -> str:
    text = owner_notes.strip()
    return text if text else _EMPTY_OWNER_NOTES_PLACEHOLDER


def format_ig_format_user_message(
    *,
    goal: str,
    owner_notes: str,
    context_payload: dict[str, Any],
) -> str:
    context_json = json.dumps(context_payload, ensure_ascii=False, indent=2)
    return IG_FORMAT_USER_TEMPLATE.format(
        goal=_display_goal(goal),
        owner_notes=_display_owner_notes(owner_notes),
        context_json=context_json,
    )


def build_ig_format_messages(
    *,
    goal: str,
    owner_notes: str,
    context_payload: dict[str, Any],
) -> list[BaseMessage]:
    return [
        SystemMessage(content=IG_FORMAT_SYSTEM),
        HumanMessage(
            content=format_ig_format_user_message(
                goal=goal,
                owner_notes=owner_notes,
                context_payload=context_payload,
            )
        ),
    ]


def empty_format_retry_message() -> HumanMessage:
    return HumanMessage(content=IG_FORMAT_EMPTY_RETRY_MESSAGE)
