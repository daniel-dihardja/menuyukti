"""LLM-backed Markdown formatting (core platform helper)."""

from agents_app.agents.core.format_markdown.presets import get_preset_system_prompt
from agents_app.models.llm_config import get_llm_structured
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage


class UnknownPresetError(ValueError):
    """Raised when ``preset`` is not registered in ``presets.PRESETS``."""


async def format_markdown(*, content: str, preset: str) -> str:
    """
    Rewrite ``content`` as Markdown using the system rules for ``preset``.

    This is a single-shot call (no LangGraph). Used by the HTTP ``/format-markdown`` endpoint.
    """
    system = get_preset_system_prompt(preset)
    if system is None:
        raise UnknownPresetError(f"Unknown preset: {preset}")

    llm = get_llm_structured()
    msg = await llm.ainvoke(
        [
            SystemMessage(content=system),
            HumanMessage(content=content),
        ]
    )
    raw = msg.content if isinstance(msg, AIMessage) else getattr(msg, "content", "")
    if isinstance(raw, str):
        return raw.strip()
    if isinstance(raw, list):
        parts: list[str] = []
        for block in raw:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text", "")))
            elif hasattr(block, "text"):
                parts.append(str(getattr(block, "text", "")))
        return "".join(parts).strip()
    return str(raw).strip()
