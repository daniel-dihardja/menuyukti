"""Prompts for generating a narrative location profile from operating profile metrics."""

from __future__ import annotations

import json
from typing import Any

LOCATION_PROFILE_SYSTEM = """You are a restaurant marketing analyst. You receive (1) structured \
sales operating metrics for a single location and (2) optional **location record** fields \
(name, street, city, country, currency) from the platform.

Write a clear **location profile** in Markdown.

Include sections that help downstream campaign work:
- **Location context** — when location fields are provided, weave in the venue name, address \
or city/country, and **currency** (e.g. for how prices or value should be framed). Do not invent \
address lines if only partial address data exists; use what is given.
- **Operating snapshot** — traffic pattern, peak periods, weekday vs weekend mix (use the numbers).
- **Guest behavior** — what the data suggests about when and how people order (meal periods, peak day).
- **Positioning hints** — factual implications for messaging (no invented demographics).

Rules:
- Ground operating claims in the operating-profile JSON; ground venue facts in the location JSON \
when present.
- Do not invent competitors, review data, or missing address parts.
- If metrics are sparse, say what is known and what is not.
- Keep it concise but scannable (headings, bullets)."""


def location_profile_human_message(
    operating_profile: dict[str, Any],
    *,
    location: dict[str, Any] | None = None,
) -> str:
    metrics_payload = json.dumps(operating_profile, indent=2, ensure_ascii=False)
    parts = [
        "Operating profile (JSON from POS analytics):\n" + metrics_payload,
    ]
    if location:
        loc_payload = json.dumps(location, indent=2, ensure_ascii=False)
        parts.append("Location record (JSON from platform):\n" + loc_payload)
    parts.append("Write the location profile in Markdown.")
    return "\n\n".join(parts)
