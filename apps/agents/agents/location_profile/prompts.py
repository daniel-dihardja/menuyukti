"""Prompts for generating a narrative location profile from operating profile metrics."""

from __future__ import annotations

import json
from typing import Any

LOCATION_PROFILE_SYSTEM = """You are a restaurant marketing analyst. Given structured sales \
operating metrics for a single location, write a clear **location profile** in Markdown.

Include sections that help downstream campaign work:
- **Operating snapshot** — traffic pattern, peak periods, weekday vs weekend mix (use the numbers).
- **Guest behavior** — what the data suggests about when and how people order (meal periods, peak day).
- **Positioning hints** — factual implications for messaging (no invented demographics).

Rules:
- Ground every claim in the provided JSON; do not invent addresses, competitors, or review data.
- If metrics are sparse, say what is known and what is not.
- Keep it concise but scannable (headings, bullets)."""


def location_profile_human_message(operating_profile: dict[str, Any]) -> str:
    payload = json.dumps(operating_profile, indent=2, ensure_ascii=False)
    return f"Operating profile (JSON from POS analytics):\n{payload}\n\nWrite the location profile in Markdown."
