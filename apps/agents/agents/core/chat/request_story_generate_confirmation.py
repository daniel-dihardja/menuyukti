"""Story Phase 3: surface a UI confirmation affordance before generate."""

from __future__ import annotations

import json
from typing import Annotated, Any

from langchain.tools import tool
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolArg
from langgraph.types import interrupt


def _transport_from_config(config: RunnableConfig | None) -> str | None:
    conf = (config or {}).get("configurable") or {}
    raw = conf.get("transport")
    return str(raw).strip() if isinstance(raw, str) and raw.strip() else None


def _decision_action(decision: Any) -> str:
    if isinstance(decision, dict):
        action = decision.get("action")
        if isinstance(action, str) and action.strip():
            return action.strip().lower()
    if isinstance(decision, str) and decision.strip():
        return decision.strip().lower()
    return "generate"


@tool
def request_story_generate_confirmation(
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """REQUIRED to show Generate / Change buttons before image generation.

    Call this whenever you are ready to generate (enough data). Summarize the plan in the
    same turn, then call this tool — the UI will not show buttons without it. Do not only
    write “click Generate” in text. Do not call ``generate_instagram_post_image`` in the
    same turn on the ChatKit path. On CopilotKit/AG-UI the run pauses via LangGraph
    ``interrupt`` until the operator confirms; after resume you may generate in the same
    turn when the tool result includes ``confirmed: true``. Call again only after the
    user revises the plan. Never call in Phase 4 or after a generate.
    """
    if _transport_from_config(config) == "agui":
        decision = interrupt(
            {
                "kind": "story_generate_confirmation",
                "message": "Ready to generate?",
            }
        )
        action = _decision_action(decision)
        if action in {"change", "cancel", "cancelled", "reject"}:
            return json.dumps({"ok": False, "action": "change_requested"})
        return json.dumps(
            {
                "ok": True,
                "action": "request_confirmation",
                "confirmed": True,
            }
        )
    return json.dumps({"ok": True, "action": "request_confirmation"})
