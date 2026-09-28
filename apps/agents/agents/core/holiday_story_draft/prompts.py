"""Prompts for drafting one Instagram story per public holiday."""

from __future__ import annotations

import json
from typing import Any

MAX_OPERATOR_INSTRUCTIONS_LEN = 2000
MAX_FEEDBACK_LEN = 1000
MAX_CRITIQUE_PROMPT_LEN = 2000

STORY_DRAFT_SYSTEM = (
    "You draft Instagram story content for restaurants. "
    "Given venue context and one public holiday, produce a short story caption. "
    "Match the venue's cuisine, city, and tone. Keep captions scannable on mobile "
    "(prefer under ~120 characters unless operator notes say otherwise). "
    "Do not invent false promotions, hours, or claims not supported by venue context "
    "or operator instructions. "
    "When a previous draft and user feedback are provided, revise that draft to "
    "address the feedback — do not ignore the previous draft and start from scratch. "
    "Return only the structured fields requested."
)

STORY_CRITIQUE_SYSTEM = (
    "You critique Instagram story drafts for restaurants. "
    "Score the draft from 1 (poor) to 10 (excellent) strictly against the "
    "operator critique criteria provided. "
    "Be concrete: when the score is below the passing threshold, feedback must "
    "tell the writer exactly what to change in the caption. "
    "When the draft already meets the criteria, give brief confirming feedback. "
    "Do not invent venue facts. Return only the structured fields requested."
)


def normalize_operator_instructions(raw: str | None) -> str | None:
    """Trim optional operator notes; return None when empty."""
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None
    return text[:MAX_OPERATOR_INSTRUCTIONS_LEN]


def normalize_feedback(raw: str | None) -> str | None:
    """Trim revision feedback; return None when empty."""
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None
    return text[:MAX_FEEDBACK_LEN]


def normalize_critique_prompt(raw: str) -> str:
    """Trim and bound the operator critique prompt."""
    return raw.strip()[:MAX_CRITIQUE_PROMPT_LEN]


def holiday_payload(holiday: dict[str, Any]) -> dict[str, Any]:
    """Normalize a holiday row for the user prompt JSON block."""
    row: dict[str, Any] = {
        "id": str(holiday["id"]),
        "date": str(holiday.get("date") or ""),
        "name": str(holiday.get("name") or ""),
    }
    local = holiday.get("localName") or holiday.get("local_name")
    if isinstance(local, str) and local.strip():
        row["localName"] = local.strip()
    return row


def story_draft_user_text(
    *,
    location_markdown: str,
    holiday: dict[str, Any],
    operator_instructions: str | None = None,
    previous_result: dict[str, Any] | None = None,
    feedback: str | None = None,
) -> str:
    """Build the human message for a single-holiday story draft or revision."""
    payload = json.dumps(holiday_payload(holiday), ensure_ascii=False, indent=2)
    parts = [
        "## Venue context\n\n",
        f"{location_markdown.strip()}\n\n",
    ]
    notes = normalize_operator_instructions(operator_instructions)
    if notes:
        parts.append("## Operator story instructions\n\n")
        parts.append(
            "Apply these optional operator instructions when drafting "
            "(they override defaults when they conflict):\n\n"
        )
        parts.append(f"{notes}\n\n")
    parts.append("## Public holiday\n\n")
    revision_feedback = normalize_feedback(feedback)
    if previous_result is not None and revision_feedback:
        parts.append(
            "Revise the previous Instagram story draft for this holiday using "
            "the user feedback below. Keep what still works; change what the "
            "feedback asks for.\n\n"
        )
    else:
        parts.append(
            "Draft one Instagram story for this holiday: a short caption only.\n\n"
        )
    parts.append(f"```json\n{payload}\n```\n")
    if previous_result is not None and revision_feedback:
        prev_json = json.dumps(previous_result, ensure_ascii=False, indent=2)
        parts.append("\n## Previous draft\n\n")
        parts.append(f"```json\n{prev_json}\n```\n\n")
        parts.append("## User feedback\n\n")
        parts.append(
            "Apply this feedback as the primary revision directive "
            "(it overrides conflicting defaults from the previous draft):\n\n"
        )
        parts.append(f"{revision_feedback}\n")
    return "".join(parts)


def story_critique_user_text(
    *,
    location_markdown: str,
    holiday: dict[str, Any],
    draft: dict[str, Any],
    critique_prompt: str,
    min_score: int,
) -> str:
    """Build the human message for scoring one story draft against critique criteria."""
    holiday_json = json.dumps(holiday_payload(holiday), ensure_ascii=False, indent=2)
    draft_json = json.dumps(draft, ensure_ascii=False, indent=2)
    criteria = normalize_critique_prompt(critique_prompt)
    parts = [
        "## Venue context\n\n",
        f"{location_markdown.strip()}\n\n",
        "## Public holiday\n\n",
        f"```json\n{holiday_json}\n```\n\n",
        "## Draft to critique\n\n",
        f"```json\n{draft_json}\n```\n\n",
        "## Operator critique criteria\n\n",
        "Score this draft from 1 to 10 against these criteria only:\n\n",
        f"{criteria}\n\n",
        f"Passing threshold is {min_score}/10. "
        "If the score is below that threshold, feedback must be actionable "
        "revision guidance the writer can apply next.\n",
    ]
    return "".join(parts)
