"""LangGraph chat graph: ReAct advisor with chart/location tools and short-term checkpoint memory."""

from __future__ import annotations

from typing import Any

from agents_app.agents.core.chat.generate_instagram_post_image import (
    generate_instagram_post_image,
)
from agents_app.agents.core.chat.prompts import build_system_prompt
from agents_app.agents.core.chat.tools import (
    create_instagram_items,
    delete_instagram_items,
    get_chart_data,
    get_instagram_item,
    get_location_data,
    get_milestone,
    get_workflow_overview,
    list_instagram_items,
    update_instagram_items,
    update_milestone_input,
)
from agents_app.agents.core.tavily_search_tool import make_search_web_tool
from agents_app.models.llm_config import chat_llm_for_gateway_model
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.config import get_config
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt import ToolNode, create_react_agent

# Max tool/model turns per request (ReAct loop budget).
CHAT_RECURSION_LIMIT = 20


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


def chat_tools_list(
    *,
    include_post_image: bool = False,
    workflow_id: bool = True,
    milestone_id: bool = True,
    location_id: bool = True,
) -> list:
    """Build chat ReAct tools for the given request context.

    When ``workflow_id`` / ``milestone_id`` / ``location_id`` are False, the corresponding
    tools are omitted from the bound set (model cannot call them). The ToolNode still
    registers the full union via ``chat_tools_list(include_post_image=True)`` so stale
    checkpoint tool calls remain executable.

    Request-scoped binding (``chat_tools_list_from_config``) never enables workflow
    milestone or Instagram-item tools — workflow chat is an advisor over charts/location.
    """
    tools: list = []
    if workflow_id:
        tools.append(get_workflow_overview)
        tools.append(get_milestone)
        tools.append(list_instagram_items)
        tools.append(get_instagram_item)
        tools.append(create_instagram_items)
        tools.append(update_instagram_items)
        tools.append(delete_instagram_items)
        if milestone_id:
            tools.append(update_milestone_input)
    if location_id:
        tools.append(get_location_data)
        tools.append(get_chart_data)
    web = make_search_web_tool()
    if web is not None:
        tools.append(web)
    if include_post_image:
        tools.append(generate_instagram_post_image)
    return tools


def _has_leonardo_image_generation(conf: dict[str, Any]) -> bool:
    """Leonardo generate tool: workflow chat or IG Studio Post Creator page context."""
    return _has_ig_studio_post_context(conf) or _has_workflow_id(conf)


def chat_tools_list_from_config(conf: dict[str, Any]) -> list:
    """Resolve request-scoped tools from RunnableConfig.configurable.

    Milestone and Instagram-item tools are never bound to the model (advisor chat).
    They remain registered on the ToolNode for stale checkpoint compatibility.
    """
    return chat_tools_list(
        include_post_image=_has_leonardo_image_generation(conf),
        workflow_id=_has_workflow_id(conf),
        milestone_id=_has_milestone_id(conf),
        location_id=_has_location_id(conf),
    )


def _chat_prompt(state: dict[str, Any]) -> list[BaseMessage]:
    """Prepend the chat system prompt (charts / location / optional IG Studio)."""
    messages = state.get("messages") or []
    cfg = get_config() or {}
    conf = cfg.get("configurable") or {}
    conf_dict = conf if isinstance(conf, dict) else {}
    raw_catalog = conf_dict.get("workflow_catalog_markdown")
    catalog = raw_catalog if isinstance(raw_catalog, str) else None
    prompt_body = build_system_prompt(
        workflow_catalog=catalog,
        ig_studio_post_image=_has_ig_studio_post_context(conf_dict),
        leonardo_image_generation=_has_leonardo_image_generation(conf_dict),
        include_chart_catalog=_has_location_id(conf_dict),
    )
    return [SystemMessage(content=prompt_body), *messages]


def compile_chat_graph(checkpointer: BaseCheckpointSaver | None) -> CompiledStateGraph:
    """Compile the shared chat agent (single graph for all requests; context via config)."""
    # ToolNode must include every tool that may appear in checkpoint history; binding is
    # request-scoped below. handle_tool_errors=True: turn unexpected tool exceptions into
    # ToolMessages so the checkpoint is not left with dangling tool_calls.
    all_tools = chat_tools_list(
        include_post_image=True,
        workflow_id=True,
        milestone_id=True,
        location_id=True,
    )
    tool_node = ToolNode(all_tools, handle_tool_errors=True)

    def _select_chat_model(_state: dict[str, Any], _runtime: Any) -> Any:
        """Resolve LLM from RunnableConfig (set by HTTP router when client picks a model)."""
        cfg = get_config() or {}
        conf = cfg.get("configurable") or {}
        conf_dict = conf if isinstance(conf, dict) else {}
        raw = conf_dict.get("chat_gateway_model")
        gateway: str | None = raw.strip() if isinstance(raw, str) and raw.strip() else None
        llm = chat_llm_for_gateway_model(gateway, streaming=True)
        bound_tools = chat_tools_list_from_config(conf_dict)
        return llm.bind_tools(bound_tools)

    return create_react_agent(  # type: ignore[type-var]
        _select_chat_model,
        tool_node,
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
