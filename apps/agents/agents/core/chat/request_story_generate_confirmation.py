"""Story Phase 3: surface a UI confirmation affordance before generate."""

from __future__ import annotations

import json

from langchain.tools import tool


@tool
def request_story_generate_confirmation() -> str:
    """REQUIRED to show Generate / Change buttons before image generation.

    Call this whenever you are ready to generate (enough data). Summarize the plan in the
    same turn, then call this tool — the UI will not show buttons without it. Do not only
    write “click Generate” in text. Do not call ``generate_instagram_post_image`` in the
    same turn. Call again only after the user revises the plan. Never call in Phase 4 or
    after a generate.
    """
    return json.dumps({"ok": True, "action": "request_confirmation"})
