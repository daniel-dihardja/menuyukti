"""Custom chat agent state (extends LangChain AgentState)."""

from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

from langchain.agents import AgentState


class StoryAssetRef(TypedDict):
    """Labeled Story Leonardo reference (style/content photos, or last generate result)."""

    role: Literal["style", "content", "result"]
    name: str  # photos library filename, or posts filename when role=result
    note: str  # short description for prompt wording


class ChatAgentState(AgentState):
    """Chat ReAct state with optional Story asset scratchpad.

    ``messages`` use the AgentState ``add_messages`` reducer. ``story_assets`` has no
    reducer (last write wins). Tools that mutate the scratchpad must return
    ``Command(update={"story_assets": ..., "messages": [ToolMessage(...)]})`` so the
    ToolNode and checkpointer stay consistent — do not rely on returning only a string
    when state must change.
    """

    story_assets: NotRequired[list[StoryAssetRef]]
