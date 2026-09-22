"""Build Jev (System One) state and per-holiday Noul questions."""

from __future__ import annotations

import json
from typing import Any

NOUL_POLICY = (
    "Would this venue reasonably post a short Instagram story greeting for this "
    "public holiday? Prefer cultural and commercial fit to cuisine, city/country, "
    "and owner profile. Major national greetings that fit the market are relevant; "
    "low-fit or mismatched religious/cultural days are not."
)

MAX_OPERATOR_INSTRUCTIONS_LEN = 2000


def normalize_operator_instructions(raw: str | None) -> str | None:
    """Trim optional operator notes; return None when empty."""
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None
    return text[:MAX_OPERATOR_INSTRUCTIONS_LEN]


def jev_relevance_state(
    *,
    location_markdown: str,
    holidays: list[dict[str, Any]],
    operator_instructions: str | None = None,
) -> str:
    """Shared state for a single Jev systemone call (all holidays in parallel)."""
    payload = json.dumps(holidays, ensure_ascii=False, indent=2)
    parts = [
        "## Venue context\n\n",
        f"{location_markdown.strip()}\n\n",
    ]
    notes = normalize_operator_instructions(operator_instructions)
    if notes:
        parts.append("## Operator relevance notes\n\n")
        parts.append(
            "Apply these optional operator instructions when scoring "
            "(they override the default policy when they conflict):\n\n"
        )
        parts.append(f"{notes}\n\n")
    parts.append("## Public holidays\n\n")
    parts.append("Score Instagram-story greeting fit for each holiday below. ")
    parts.append(f"{NOUL_POLICY}\n\n")
    parts.append(f"```json\n{payload}\n```\n")
    return "".join(parts)


def jev_noul_questions(
    holidays: list[dict[str, Any]],
    *,
    operator_instructions: str | None = None,
) -> dict[str, dict[str, str]]:
    """One Noul per holiday id — evaluated in parallel by Jev."""
    notes = normalize_operator_instructions(operator_instructions)
    extra = f" Operator notes: {notes}" if notes else ""
    questions: dict[str, dict[str, str]] = {}
    for row in holidays:
        holiday_id = str(row["id"])
        name = str(row.get("name") or holiday_id)
        date = str(row.get("date") or "")
        questions[holiday_id] = {
            "type": "noul",
            "instructions": (
                f"Is public holiday '{name}' ({date}) a good Instagram story "
                f"greeting opportunity for this venue? {NOUL_POLICY}{extra}"
            ),
        }
    return questions
