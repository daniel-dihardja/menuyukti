"""Shared utilities for planning subgraph nodes."""

from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig


async def _emit(step: str, status: str, label: str, config: RunnableConfig) -> None:
    """Dispatch a named activity event to the LangGraph callback stream."""
    await adispatch_custom_event(
        "activity",
        {"step": step, "status": status, "label": label},
        config=config,
    )
