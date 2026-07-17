"""LangGraph chat graph: ReAct agent with get_milestone_data and short-term checkpoint memory."""

from __future__ import annotations

from typing import Any

from agents_app.agents.core.chat.prompts import build_system_prompt
from agents_app.agents.core.chat.tools import (
    get_location_data,
    get_milestone_data,
    get_milestone_help,
    get_milestone_input_json,
    get_milestone_preset_data_json,
    get_workflow_overview,
    update_milestone_input,
)
from agents_app.agents.core.tavily_search_tool import make_search_web_tool
from agents_app.models.llm_config import chat_llm_for_gateway_model
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.config import get_config
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import create_react_agent

# Max tool/model turns per request (ReAct loop budget).
CHAT_RECURSION_LIMIT = 20


def chat_tools_list() -> list:
    """Build chat ReAct tools (optional ``search_web`` when ``TAVILY_API_KEY`` is set)."""
    tools: list = [
        get_workflow_overview,
        get_milestone_data,
        get_milestone_help,
        get_milestone_input_json,
        get_milestone_preset_data_json,
        update_milestone_input,
        get_location_data,
    ]
    web = make_search_web_tool()
    if web is not None:
        tools.append(web)
    return tools


def _chat_prompt(state: dict[str, Any]) -> list[BaseMessage]:
    """Prepend the chat system prompt."""
    messages = state.get("messages") or []
    prompt_body = build_system_prompt()
    return [SystemMessage(content=prompt_body), *messages]


def compile_chat_graph(checkpointer: BaseCheckpointSaver | None) -> CompiledStateGraph:
    """Compile the shared chat agent (single graph for all requests; milestone context via config)."""
    # Resolve tools at compile time so ``load_dotenv()`` in ``server.py`` has already run.
    tools = chat_tools_list()

    def _select_chat_model(_state: dict[str, Any], _runtime: Any) -> Any:
        """Resolve LLM from RunnableConfig (set by HTTP router when client picks a model)."""
        cfg = get_config() or {}
        conf = cfg.get("configurable") or {}
        raw = conf.get("chat_gateway_model")
        gateway: str | None = raw.strip() if isinstance(raw, str) and raw.strip() else None
        llm = chat_llm_for_gateway_model(gateway, streaming=True)
        return llm.bind_tools(tools)

    return create_react_agent(  # type: ignore[type-var]
        _select_chat_model,
        tools,
        prompt=_chat_prompt,
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
