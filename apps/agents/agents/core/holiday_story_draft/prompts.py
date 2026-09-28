"""Prompts for drafting one Instagram story per public holiday."""

from __future__ import annotations

import json
from typing import Any

MAX_OPERATOR_INSTRUCTIONS_LEN = 2000

STORY_DRAFT_SYSTEM = (
    "You draft Instagram story content for restaurants. "
    "Given venue context and one public holiday, produce a short story caption "
    "and a concise visual art-direction brief. "
    "Match the venue's cuisine, city, and tone. Keep captions scannable on mobile "
    "(prefer under ~120 characters unless operator notes say otherwise). "
    "Do not invent false promotions, hours, or claims not supported by venue context "
    "or operator instructions. Return only the structured fields requested."
)


def normalize_operator_instructions(raw: str | None) -> str | None:
    """Trim optional operator notes; return None when empty."""
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None
    return text[:MAX_OPERATOR_INSTRUCTIONS_LEN]


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
) -> str:
    """Build the human message for a single-holiday story draft."""
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
    parts.append(
        "Draft one Instagram story for this holiday: a short caption "
        "and a visual brief for artwork.\n\n"
    )
    parts.append(f"```json\n{payload}\n```\n")
    return "".join(parts)
