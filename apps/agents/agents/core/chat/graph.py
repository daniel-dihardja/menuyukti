"""LangGraph chat graph: create_agent with short-term checkpoint memory."""

from __future__ import annotations

from typing import Any

from agents_app.agents.core.chat.limits import CHAT_RECURSION_LIMIT
from agents_app.agents.core.chat.middleware import (
    _chat_system_prompt_from_config,
    _handle_tool_errors,
    _retry_chat_model_call,
    _select_chat_model_and_tools,
    dynamic_chat_prompt,
    handle_tool_errors,
    record_chat_llm_usage,
    retry_chat_model_call,
    select_chat_model_and_tools,
)
from agents_app.agents.core.chat.state import ChatAgentState
from agents_app.agents.core.chat.tools_registry import (
    STORY_SCRATCHPAD_TOOLS,
    chat_tools_list,
    chat_tools_list_from_config,
)
from agents_app.models.llm_config import chat_llm_for_gateway_model
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.graph.state import CompiledStateGraph

# Re-export for callers / tests that import from graph.
__all__ = [
    "CHAT_RECURSION_LIMIT",
    "_chat_system_prompt_from_config",
    "_handle_tool_errors",
    "_retry_chat_model_call",
    "_select_chat_model_and_tools",
    "chat_tools_list",
    "chat_tools_list_from_config",
    "compile_chat_graph",
    "incremental_user_message",
]


def compile_chat_graph(checkpointer: BaseCheckpointSaver | None) -> CompiledStateGraph:
    """Compile the shared chat agent (single graph for all requests; context via config)."""
    # ToolNode must include every tool the model may bind; binding is request-scoped below.
    all_tools = [
        *chat_tools_list(
            include_post_image=True,
            location_id=True,
            analytics_run=True,
        ),
        *STORY_SCRATCHPAD_TOOLS,
    ]
    # Placeholder model — overridden per request by select_chat_model_and_tools.
    placeholder_llm = chat_llm_for_gateway_model(None, streaming=True)
    # Middleware order: prompt → select model/tools/trim → retry → record usage → tool errors.
    return create_agent(
        model=placeholder_llm,
        tools=all_tools,
        middleware=[
            dynamic_chat_prompt,
            select_chat_model_and_tools,
            retry_chat_model_call,
            record_chat_llm_usage,
            handle_tool_errors,
        ],
        state_schema=ChatAgentState,
        checkpointer=checkpointer,
        name="menuyukti_chat",
    )


def _normalize_user_content(content: Any) -> str | list[str | dict[Any, Any]]:
    """Accept plain text or OpenAI-style multimodal content blocks."""
    if isinstance(content, str):
        if not content.strip():
            msg = "User message content must be non-empty"
            raise ValueError(msg)
        return content

    if not isinstance(content, list) or len(content) == 0:
        msg = "User message content must be a non-empty string or content block list"
        raise ValueError(msg)

    blocks: list[str | dict[Any, Any]] = []
    has_text = False
    has_image = False
    for block in content:
        if not isinstance(block, dict):
            msg = "Each content block must be an object"
            raise ValueError(msg)
        block_type = block.get("type")
        if block_type == "text":
            text = block.get("text")
            if not isinstance(text, str) or not text.strip():
                msg = "text content blocks must include non-empty text"
                raise ValueError(msg)
            blocks.append({"type": "text", "text": text})
            has_text = True
        elif block_type == "image_url":
            image_url = block.get("image_url")
            if isinstance(image_url, str) and image_url.strip():
                url = image_url.strip()
            elif isinstance(image_url, dict):
                raw_url = image_url.get("url")
                if not isinstance(raw_url, str) or not raw_url.strip():
                    msg = "image_url blocks must include a non-empty url"
                    raise ValueError(msg)
                url = raw_url.strip()
            else:
                msg = "image_url blocks must include a url string or {url} object"
                raise ValueError(msg)
            if not (url.startswith("data:image/") or url.startswith("https://")):
                msg = "image_url must be a data:image/... or https:// URL"
                raise ValueError(msg)
            blocks.append({"type": "image_url", "image_url": {"url": url}})
            has_image = True
        else:
            msg = f"Unsupported content block type: {block_type!r}"
            raise ValueError(msg)

    if not has_text and not has_image:
        msg = "User message content must include text or image blocks"
        raise ValueError(msg)

    # Image-only turns need a text cue so tool-calling models still have instruction text.
    if has_image and not has_text:
        blocks.insert(0, {"type": "text", "text": "Please analyze the attached image(s)."})

    return blocks


def incremental_user_message(messages: list[dict[str, Any]]) -> HumanMessage:
    """Validate the request carries exactly one new user message (checkpoint supplies prior turns)."""
    if len(messages) != 1:
        msg = "Expected exactly one user message per request"
        raise ValueError(msg)
    m = messages[0]
    role = m["role"]
    if role != "user":
        msg = f"Message must be user role, got {role}"
        raise ValueError(msg)
    return HumanMessage(content=_normalize_user_content(m["content"]))
