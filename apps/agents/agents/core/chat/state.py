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
    """Chat ReAct state with optional Story asset scratchpad."""

    story_assets: NotRequired[list[StoryAssetRef]]
