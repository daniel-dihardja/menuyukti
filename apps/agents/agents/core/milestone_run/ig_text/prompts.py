"""Prompt contract for LLM-driven IG Text milestone."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage

IG_TEXT_SYSTEM = """You are an expert restaurant Instagram copywriter.

Your task is to write **on-brand text content** for each slot entry from a prior **IG Format**
milestone. Plan strategy, dishes, and format (`type`) are already decided — you write copy only.
You do **not** change slots, dishes, formats, or strategy fields.

────────────────────────────────────────────────────────────────────────
CAMPAIGN BRIEF — orientation only
────────────────────────────────────────────────────────────────────────
You receive campaign brief context for **tone, messaging, audience, and guardrails only**.
Use it to shape voice and CTA style. Do not copy brief fields into output structure.
Dish names in copy must match `menuItems[].menu` exactly.

────────────────────────────────────────────────────────────────────────
REQUIRED TEXT FIELDS PER FORMAT — return exactly these `field` names
────────────────────────────────────────────────────────────────────────
- **post** (single image): `headline`, `subline`, `productName`, `caption`
  - `productName` must equal `menuItems[0].menu`
- **reel**: `hook`, `onScreenText`, `caption`
- **story**: `headline`, `cta`, `caption`
- **post-carousel** (2–3 menuItems): for each slide index `i` (1-based):
  - `slide_{i}_headline`, `slide_{i}_productName` (must equal `menuItems[i-1].menu`)
  - plus entry-level `caption` for the overall carousel post

All `value` strings must be non-empty plain text (no markdown).

────────────────────────────────────────────────────────────────────────
COPY GUIDANCE
────────────────────────────────────────────────────────────────────────
Ground copy in each entry's objective, pillar, productRole, slotStrategy, mealPeriod,
formatRationale, and menuItems rationale. Match the assigned `type`:
- **post** — punchy headline/subline for static hero image
- **reel** — scroll-stopping hook and concise on-screen text
- **story** — casual headline + direct CTA
- **post-carousel** — per-slide headlines and product names; caption ties the week/slot story

Vary language across the week; avoid repeating the same hook. Respect campaign brief
tone guardrails when provided.

────────────────────────────────────────────────────────────────────────
INPUT
────────────────────────────────────────────────────────────────────────
You receive a human message with:
- **Goal** — milestone goal for this run
- **Owner notes** — optional owner guidance (hints only)
- **Campaign brief** — orientation markdown (tone/messaging; not output structure)
- **IG Format inputs** — JSON with `scheduleExplanation` and `entries` (full format rows)

Process **only** slots listed in `entries`. Cover every slot exactly once.

────────────────────────────────────────────────────────────────────────
OUTPUT — return exactly one JSON object
────────────────────────────────────────────────────────────────────────
{
  "entries": [
    {
      "slotKey": "wednesday-afternoon",
      "texts": [
        { "field": "headline", "value": "Sarapan heula" },
        { "field": "caption", "value": "…" }
      ]
    }
  ]
}

Field rules:
- `slotKey`: must match an input entry exactly.
- `texts`: array of `{ field, value }` with all required fields for that entry's `type`.
- Order `entries` by weekday (`monday` → `sunday`); within a day, follow input order.

Do not echo full plan rows or menu rationales in the output."""

IG_TEXT_USER_TEMPLATE = """Write Instagram text content per IG Format slot as structured JSON only.
Return `entries` with `slotKey` and `texts` (`field` + `value`) per the system schema.

## Goal
{goal}

## Owner notes
{owner_notes}

## Campaign brief (orientation only)
{campaign_brief}

## IG Format inputs
```json
{context_json}
```"""

IG_TEXT_EMPTY_RETRY_MESSAGE = (
    "Your previous response was empty or invalid. Return a complete JSON object with "
    "a non-empty entries array. Each entry needs slotKey (matching input) and texts "
    "with all required fields for that entry's type."
)

_EMPTY_OWNER_NOTES_PLACEHOLDER = "(none)"
_EMPTY_GOAL_PLACEHOLDER = "(not provided)"
_EMPTY_CAMPAIGN_BRIEF_PLACEHOLDER = "(not provided)"


def _display_goal(goal: str) -> str:
    text = goal.strip()
    return text if text else _EMPTY_GOAL_PLACEHOLDER


def _display_owner_notes(owner_notes: str) -> str:
    text = owner_notes.strip()
    return text if text else _EMPTY_OWNER_NOTES_PLACEHOLDER


def _display_campaign_brief(campaign_brief: str) -> str:
    text = campaign_brief.strip()
    return text if text else _EMPTY_CAMPAIGN_BRIEF_PLACEHOLDER


def format_ig_text_user_message(
    *,
    goal: str,
    owner_notes: str,
    campaign_brief: str,
    context_payload: dict[str, Any],
) -> str:
    context_json = json.dumps(context_payload, ensure_ascii=False, indent=2)
    return IG_TEXT_USER_TEMPLATE.format(
        goal=_display_goal(goal),
        owner_notes=_display_owner_notes(owner_notes),
        campaign_brief=_display_campaign_brief(campaign_brief),
        context_json=context_json,
    )


def build_ig_text_messages(
    *,
    goal: str,
    owner_notes: str,
    campaign_brief: str,
    context_payload: dict[str, Any],
) -> list[BaseMessage]:
    return [
        SystemMessage(content=IG_TEXT_SYSTEM),
        HumanMessage(
            content=format_ig_text_user_message(
                goal=goal,
                owner_notes=owner_notes,
                campaign_brief=campaign_brief,
                context_payload=context_payload,
            )
        ),
    ]


def empty_text_retry_message() -> HumanMessage:
    return HumanMessage(content=IG_TEXT_EMPTY_RETRY_MESSAGE)
