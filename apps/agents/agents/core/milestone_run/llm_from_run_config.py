"""Resolve ChatOpenAI from RunnableConfig for milestone preset subgraph nodes."""

from __future__ import annotations

from agents_app.models.llm_config import chat_llm_for_gateway_model
from langchain_openai import ChatOpenAI
from langgraph.config import get_config


def structured_llm_from_milestone_run_config() -> ChatOpenAI:
    """Non-streaming gateway LLM; uses ``configurable.chat_gateway_model`` when set."""
    cfg = get_config() or {}
    conf = cfg.get("configurable") or {}
    raw = conf.get("chat_gateway_model")
    gateway: str | None = raw.strip() if isinstance(raw, str) and raw.strip() else None
    return chat_llm_for_gateway_model(gateway, streaming=False)
