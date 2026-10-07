"""Prompts for drafting one visual brief per public holiday."""

from __future__ import annotations

import json
from typing import Any

MAX_OPERATOR_INSTRUCTIONS_LEN = 2000
MAX_FEEDBACK_LEN = 1000

# Leonardo generation API rejects prompts over 1500 characters.
MAX_LEONARDO_PROMPT_LEN = 1500

VISUAL_BRIEF_SYSTEM = (
    "You write visual briefs for Instagram story images for restaurants. "
    "Given venue context, a shared style foundation, one public holiday, and the "
    "story caption, produce a visual brief: scene, mood, composition (9:16 portrait), "
    "and a ready Leonardo text-to-image prompt. "
    "The leonardoPrompt must incorporate the style foundation and be self-contained "
    "for image generation. Keep leonardoPrompt at or under 1500 characters "
    f"(hard Leonardo API limit; prefer concise prompts, typically under "
    f"{MAX_LEONARDO_PROMPT_LEN} chars). "
    "Do not put readable UI text or logos in the image prompt "
    "unless the operator instructions explicitly require it. "
    "Do not invent false promotions or venue facts. "
    "When a previous brief and user feedback are provided, revise that brief. "
    "Return only the structured fields requested."
)


def normalize_operator_instructions(raw: str | None) -> str | None:
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None
    return text[:MAX_OPERATOR_INSTRUCTIONS_LEN]


def normalize_feedback(raw: str | None) -> str | None:
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None
    return text[:MAX_FEEDBACK_LEN]


def holiday_payload(holiday: dict[str, Any]) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": str(holiday["id"]),
        "date": str(holiday.get("date") or ""),
        "name": str(holiday.get("name") or ""),
    }
    local = holiday.get("localName") or holiday.get("local_name")
    if isinstance(local, str) and local.strip():
        row["localName"] = local.strip()
    return row


def visual_brief_user_text(
    *,
    location_markdown: str,
    holiday: dict[str, Any],
    story_caption: str,
    style_analysis: dict[str, Any],
    operator_instructions: str | None = None,
    previous_result: dict[str, Any] | None = None,
    feedback: str | None = None,
) -> str:
    holiday_json = json.dumps(holiday_payload(holiday), ensure_ascii=False, indent=2)
    style_json = json.dumps(style_analysis, ensure_ascii=False, indent=2)
    parts = [
        "## Venue context\n\n",
        f"{location_markdown.strip()}\n\n",
        "## Style foundation\n\n",
        f"{style_json}\n\n",
        "## Story caption\n\n",
        f"{story_caption.strip()}\n\n",
    ]
    notes = normalize_operator_instructions(operator_instructions)
    if notes:
        parts.append("## Operator visual instructions\n\n")
        parts.append(
            "Apply these optional operator instructions when drafting "
            "(they override defaults when they conflict):\n\n"
        )
        parts.append(f"{notes}\n\n")
    parts.append("## Public holiday\n\n")
    revision_feedback = normalize_feedback(feedback)
    if previous_result is not None and revision_feedback:
        parts.append(
            "Revise the previous visual brief for this holiday using "
            "the user feedback below. Keep what still works; change what the "
            "feedback asks for.\n\n"
        )
        parts.append(f"{holiday_json}\n\n")
        parts.append("## Previous brief\n\n")
        parts.append(
            f"{json.dumps(previous_result, ensure_ascii=False, indent=2)}\n\n"
        )
        parts.append("## User feedback\n\n")
        parts.append(f"{revision_feedback}\n")
    else:
        parts.append(
            "Draft one visual brief for this holiday: scene, mood, composition, "
            f"and leonardoPrompt (at most {MAX_LEONARDO_PROMPT_LEN} characters).\n\n"
        )
        parts.append(f"{holiday_json}\n")
    return "".join(parts)
