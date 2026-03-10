"""Shared utilities for planning subgraph nodes."""

import logging
import os
from dataclasses import replace
from typing import Any

import httpx
from langchain_core.callbacks.manager import adispatch_custom_event
from langchain_core.runnables import RunnableConfig

from agent.state import PlanningState

logger = logging.getLogger(__name__)


async def _gql(query: str, variables: dict[str, Any]) -> dict[str, Any]:
    """Execute a GraphQL query against the configured endpoint and return the `data` payload."""
    endpoint = os.environ["GRAPHQL_ENDPOINT"]
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(endpoint, json={"query": query, "variables": variables})
    res.raise_for_status()
    return res.json().get("data") or {}


def _update_planning(planning: PlanningState | None, **kwargs: Any) -> PlanningState:
    """Return an updated PlanningState, creating a new one if none exists yet."""
    return replace(planning, **kwargs) if planning else PlanningState(**kwargs)


async def _emit(step: str, status: str, label: str, config: RunnableConfig) -> None:
    """Dispatch a named activity event to the LangGraph callback stream."""
    await adispatch_custom_event(
        "activity",
        {"step": step, "status": status, "label": label},
        config=config,
    )
