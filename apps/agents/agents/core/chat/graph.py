"""LangGraph chat graph: create_agent with short-term checkpoint memory."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from agents_app.agents.core.chat.generate_instagram_post_image import (
    generate_instagram_post_image,
)
from agents_app.agents.core.chat.prompts import build_system_prompt
from agents_app.agents.core.chat.request_story_generate_confirmation import (
    request_story_generate_confirmation,
)
from agents_app.agents.core.chat.state import ChatAgentState
from agents_app.agents.core.chat.story_assets import clear_story_assets, save_story_asset
from agents_app.agents.core.chat.tools import (
    get_chart_data,
    get_location_data,
    list_media,
    list_media_collections,
)
from agents_app.agents.core.llm_invoke import (
    DEFAULT_BASE_DELAY_S,
    DEFAULT_MAX_ATTEMPTS,
    is_retryable_llm_error,
)
from agents_app.agents.core.tavily_search_tool import make_search_web_tool
from agents_app.models.llm_config import chat_llm_for_gateway_model
from langchain.agents import create_agent
from langchain.agents.middleware import (
    ModelRequest,
    ToolCallRequest,
    dynamic_prompt,
    wrap_model_call,
    wrap_tool_call,
)
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_core.messages.utils import trim_messages
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.config import get_config
from langgraph.graph.state import CompiledStateGraph
from langgraph.types import Command

# Max tool/model turns per request (ReAct loop budget).
CHAT_RECURSION_LIMIT = 20

# Approximate token budget for model-bound history (checkpoint retains full thread).
CHAT_HISTORY_MAX_TOKENS = 60_000
# Log when checkpoint messages exceed this count (observability only).
CHAT_HISTORY_LOG_MESSAGE_THRESHOLD = 80

_logger = logging.getLogger(__name__)

_STORY_SCRATCHPAD_TOOLS = [
    save_story_asset,
    clear_story_assets,
    request_story_generate_confirmation,
]


def _has_ig_studio_post_context(conf: dict[str, Any]) -> bool:
    post_id = conf.get("post_id")
    page_id = conf.get("page_id")
    return bool(
        isinstance(post_id, str)
        and post_id.strip()
        and isinstance(page_id, str)
        and page_id.strip()
    )


def _has_location_id(conf: dict[str, Any]) -> bool:
    return conf.get("location_id") is not None


def _is_image_assistant_mode(conf: dict[str, Any]) -> bool:
    mode = conf.get("chat_mode")
    return mode in ("image_assistant", "story_image_assistant")


def chat_tools_list(
    *,
    include_post_image: bool = False,
    location_id: bool = True,
    image_assistant: bool = False,
) -> list:
    """Build chat ReAct tools for the given request context.

    When ``location_id`` is False, location/chart tools are omitted. The ToolNode still
    registers the full union via ``chat_tools_list(include_post_image=True)`` plus
    Story scratchpad tools.

    In ``image_assistant`` mode only media-library tools, Story scratchpad tools,
    confirmation UI, and ``generate_instagram_post_image`` are bound.
    """
    if image_assistant:
        return [
            list_media_collections,
            list_media,
            save_story_asset,
            clear_story_assets,
            request_story_generate_confirmation,
            generate_instagram_post_image,
        ]

    tools: list = []
    tools.append(list_media_collections)
    tools.append(list_media)
    if location_id:
        tools.append(get_location_data)
        tools.append(get_chart_data)
    web = make_search_web_tool()
    if web is not None:
        tools.append(web)
    if include_post_image:
        tools.append(generate_instagram_post_image)
    return tools


def _has_agent_thread_id(conf: dict[str, Any]) -> bool:
    raw = conf.get("agent_thread_id")
    return isinstance(raw, str) and bool(raw.strip())


def _has_leonardo_image_generation(conf: dict[str, Any]) -> bool:
    """Leonardo generate tool: IG Studio or agent-thread chat."""
    return _has_ig_studio_post_context(conf) or _has_agent_thread_id(conf)


def chat_tools_list_from_config(conf: dict[str, Any]) -> list:
    """Resolve request-scoped tools from RunnableConfig.configurable."""
    if _is_image_assistant_mode(conf):
        return chat_tools_list(image_assistant=True)
    return chat_tools_list(
        include_post_image=_has_leonardo_image_generation(conf),
        location_id=_has_location_id(conf),
    )


def _chat_system_prompt_from_config() -> str:
    """Build the chat system prompt from RunnableConfig.configurable."""
    cfg = get_config() or {}
    conf = cfg.get("configurable") or {}
    conf_dict = conf if isinstance(conf, dict) else {}
    raw_mode = conf_dict.get("chat_mode")
    chat_mode = raw_mode if isinstance(raw_mode, str) else None
    raw_format = conf_dict.get("image_format")
    image_format = raw_format if isinstance(raw_format, str) else None
    return build_system_prompt(
        ig_studio_post_image=_has_ig_studio_post_context(conf_dict),
        leonardo_image_generation=_has_leonardo_image_generation(conf_dict),
        include_chart_catalog=_has_location_id(conf_dict),
        chat_mode=chat_mode,
        image_format=image_format,
    )


@dynamic_prompt  # type: ignore[arg-type]
async def _dynamic_chat_prompt(_request: ModelRequest) -> str:
    return _chat_system_prompt_from_config()


def _trim_chat_messages(messages: list[Any]) -> list[Any]:
    """Keep recent history within an approximate token budget for the model call."""
    if not messages:
        return messages
    if len(messages) >= CHAT_HISTORY_LOG_MESSAGE_THRESHOLD:
        _logger.info(
            "chat history size messages=%s (trim_budget_tokens=%s)",
            len(messages),
            CHAT_HISTORY_MAX_TOKENS,
        )
    try:
        return trim_messages(
            messages,
            max_tokens=CHAT_HISTORY_MAX_TOKENS,
            token_counter="approximate",
            strategy="last",
            start_on="human",
            include_system=True,
        )
    except Exception:  # noqa: BLE001 — fall back to untrimmed history
        _logger.warning("chat history trim failed; using full message list", exc_info=True)
        return messages


@wrap_model_call  # type: ignore[arg-type]
async def _select_chat_model_and_tools(request: ModelRequest, handler: Any) -> Any:
    """Resolve LLM + request-scoped tools from RunnableConfig (set by HTTP router).

    Order vs other middleware: touches model/tools/messages only; dynamic_prompt sets
    system_message separately — fields are disjoint so ordering is safe.
    """
    cfg = get_config() or {}
    conf = cfg.get("configurable") or {}
    conf_dict = conf if isinstance(conf, dict) else {}
    raw = conf_dict.get("chat_gateway_model")
    gateway: str | None = raw.strip() if isinstance(raw, str) and raw.strip() else None
    llm = chat_llm_for_gateway_model(gateway, streaming=True)
    bound_tools = chat_tools_list_from_config(conf_dict)
    trimmed = _trim_chat_messages(list(request.messages))
    return await handler(request.override(model=llm, tools=bound_tools, messages=trimmed))


@wrap_model_call  # type: ignore[arg-type]
async def _retry_chat_model_call(request: ModelRequest, handler: Any) -> Any:
    """Retry transient LLM/gateway failures (runs after model/tools override)."""
    last: BaseException | None = None
    for attempt in range(1, DEFAULT_MAX_ATTEMPTS + 1):
        try:
            return await handler(request)
        except Exception as exc:
            last = exc
            if attempt >= DEFAULT_MAX_ATTEMPTS or not is_retryable_llm_error(exc):
                raise
            delay = DEFAULT_BASE_DELAY_S * (2 ** (attempt - 1))
            _logger.warning(
                "chat model: retry attempt=%s/%s delay=%.1fs error=%s",
                attempt,
                DEFAULT_MAX_ATTEMPTS,
                delay,
                exc,
            )
            await asyncio.sleep(delay)
    assert last is not None
    raise last


@wrap_tool_call  # type: ignore[arg-type]
async def _handle_tool_errors(
    request: ToolCallRequest,
    handler: Any,
) -> ToolMessage | Command[Any]:
    """Surface tool exceptions as error ToolMessages (replaces ToolNode private patch)."""
    try:
        return await handler(request)
    except Exception as exc:  # noqa: BLE001 — keep ReAct loop alive
        tool_call = request.tool_call if isinstance(request.tool_call, dict) else {}
        tool_call_id = tool_call.get("id") or ""
        name = tool_call.get("name") or "tool"
        return ToolMessage(
            content=f"Error running {name}: {exc}",
            tool_call_id=str(tool_call_id),
            status="error",
        )


def compile_chat_graph(checkpointer: BaseCheckpointSaver | None) -> CompiledStateGraph:
    """Compile the shared chat agent (single graph for all requests; context via config)."""
    # ToolNode must include every tool the model may bind; binding is request-scoped below.
    all_tools = [
        *chat_tools_list(
            include_post_image=True,
            location_id=True,
        ),
        *_STORY_SCRATCHPAD_TOOLS,
    ]
    # Placeholder model — overridden per request by _select_chat_model_and_tools.
    placeholder_llm = chat_llm_for_gateway_model(None, streaming=True)
    # Middleware order: prompt → select model/tools/trim → retry model → tool errors.
    return create_agent(
        model=placeholder_llm,
        tools=all_tools,
        middleware=[
            _dynamic_chat_prompt,
            _select_chat_model_and_tools,
            _retry_chat_model_call,
            _handle_tool_errors,
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
