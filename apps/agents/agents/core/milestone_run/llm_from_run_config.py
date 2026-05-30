"""Resolve ChatOpenAI from RunnableConfig for milestone preset subgraph nodes."""

from __future__ import annotations

from collections.abc import Sequence
from typing import TypeVar

from agents_app.agents.core.llm_invoke import (
    astream_collect_with_retry,
    structured_ainvoke_with_retry,
)
from agents_app.models.llm_config import chat_llm_for_gateway_model
from langchain_core.messages import BaseMessage
from langchain_openai import ChatOpenAI
from langgraph.config import get_config
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def structured_llm_from_milestone_run_config() -> ChatOpenAI:
    """Non-streaming gateway LLM; uses ``configurable.chat_gateway_model`` when set."""
    cfg = get_config() or {}
    conf = cfg.get("configurable") or {}
    raw = conf.get("chat_gateway_model")
    gateway: str | None = raw.strip() if isinstance(raw, str) and raw.strip() else None
    return chat_llm_for_gateway_model(gateway, streaming=False)


async def structured_ainvoke_from_run_config[T: BaseModel](
    output_model: type[T],
    messages: Sequence[BaseMessage],
) -> T:
    """Structured LLM call with retries using the milestone run gateway model."""
    llm = structured_llm_from_milestone_run_config()
    return await structured_ainvoke_with_retry(llm, output_model, messages)


async def astream_collect_from_run_config(messages: Sequence[BaseMessage]) -> str:
    """Streaming LLM call with retries; returns concatenated assistant text."""
    llm = structured_llm_from_milestone_run_config()
    return await astream_collect_with_retry(llm, messages)
