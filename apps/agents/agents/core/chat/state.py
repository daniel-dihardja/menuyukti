"""Custom chat agent state (extends LangChain AgentState)."""

from __future__ import annotations

from typing import Literal, NotRequired, TypedDict

from langchain.agents import AgentState


class StoryAssetRef(TypedDict):
    """Labeled media-library photo used as a Leonardo reference for Story generation."""

    role: Literal["style", "product"]
    name: str  # media library photo filename
    note: str  # short description for prompt wording


class ChatAgentState(AgentState):
    """Chat ReAct state with optional Story asset scratchpad."""

    story_assets: NotRequired[list[StoryAssetRef]]
