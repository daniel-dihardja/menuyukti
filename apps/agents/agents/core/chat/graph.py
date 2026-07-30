"""LangGraph chat graph: create_agent with get_milestone and short-term checkpoint memory."""

from __future__ import annotations

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
    get_milestone,
    get_workflow_overview,
    list_media,
    list_media_collections,
    update_milestone_input,
)
from agents_app.agents.core.tavily_search_tool import make_search_web_tool
from agents_app.models.llm_config import chat_llm_for_gateway_model
from langchain.agents import create_agent
from langchain.agents.middleware import ModelRequest, dynamic_prompt, wrap_model_call
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.config import get_config
from langgraph.graph.state import CompiledStateGraph
from langgraph.prebuilt.tool_node import ToolNode

# Max tool/model turns per request (ReAct loop budget).
CHAT_RECURSION_LIMIT = 20

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


def _has_workflow_id(conf: dict[str, Any]) -> bool:
    raw = conf.get("workflow_id")
    return isinstance(raw, str) and bool(raw.strip())


def _has_milestone_id(conf: dict[str, Any]) -> bool:
    raw = conf.get("milestone_id")
    if isinstance(raw, str):
        return bool(raw.strip())
    return raw is not None


def _has_location_id(conf: dict[str, Any]) -> bool:
    return conf.get("location_id") is not None


def _is_story_image_assistant_mode(conf: dict[str, Any]) -> bool:
    return conf.get("chat_mode") == "story_image_assistant"


def chat_tools_list(
    *,
    include_post_image: bool = False,
    workflow_id: bool = True,
    milestone_id: bool = True,
    location_id: bool = True,
    story_image_assistant: bool = False,
) -> list:
    """Build chat ReAct tools for the given request context.

    When ``workflow_id`` / ``milestone_id`` / ``location_id`` are False, the corresponding
    tools are omitted from the bound set (model cannot call them). The ToolNode still
    registers the full union via ``chat_tools_list(include_post_image=True)`` plus
    Story scratchpad tools.

    In ``story_image_assistant`` mode only media-library tools, Story scratchpad tools,
    confirmation UI, and ``generate_instagram_post_image`` are bound (Story gather +
    generate/refine; no campaign tooling).
    """
    if story_image_assistant:
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
    if workflow_id:
        tools.append(get_workflow_overview)
        tools.append(get_milestone)
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
    """Resolve request-scoped tools from RunnableConfig.configurable."""
    if _is_story_image_assistant_mode(conf):
        return chat_tools_list(story_image_assistant=True)
    return chat_tools_list(
        include_post_image=_has_leonardo_image_generation(conf),
        workflow_id=_has_workflow_id(conf),
        milestone_id=_has_milestone_id(conf),
        location_id=_has_location_id(conf),
    )


def _chat_system_prompt_from_config() -> str:
    """Build the chat system prompt from RunnableConfig.configurable."""
    cfg = get_config() or {}
    conf = cfg.get("configurable") or {}
    conf_dict = conf if isinstance(conf, dict) else {}
    raw_mode = conf_dict.get("chat_mode")
    chat_mode = raw_mode if isinstance(raw_mode, str) else None
    raw_catalog = conf_dict.get("workflow_catalog_markdown")
    catalog = raw_catalog if isinstance(raw_catalog, str) else None
    return build_system_prompt(
        workflow_catalog=catalog,
        ig_studio_post_image=_has_ig_studio_post_context(conf_dict),
        leonardo_image_generation=_has_leonardo_image_generation(conf_dict),
        include_chart_catalog=_has_location_id(conf_dict),
        chat_mode=chat_mode,
    )


def _chat_prompt(state: dict[str, Any]) -> list[BaseMessage]:
    """Prepend the chat system prompt (with optional injected workflow catalog).

    Kept for unit tests; the live graph uses :func:`_dynamic_chat_prompt` middleware.
    """
    messages = state.get("messages") or []
    return [SystemMessage(content=_chat_system_prompt_from_config()), *messages]


@dynamic_prompt  # type: ignore[arg-type]
async def _dynamic_chat_prompt(_request: ModelRequest) -> str:
    return _chat_system_prompt_from_config()


@wrap_model_call  # type: ignore[arg-type]
async def _select_chat_model_and_tools(request: ModelRequest, handler: Any) -> Any:
    """Resolve LLM + request-scoped tools from RunnableConfig (set by HTTP router)."""
    cfg = get_config() or {}
    conf = cfg.get("configurable") or {}
    conf_dict = conf if isinstance(conf, dict) else {}
    raw = conf_dict.get("chat_gateway_model")
    gateway: str | None = raw.strip() if isinstance(raw, str) and raw.strip() else None
    llm = chat_llm_for_gateway_model(gateway, streaming=True)
    bound_tools = chat_tools_list_from_config(conf_dict)
    return await handler(request.override(model=llm, tools=bound_tools))


def _enable_handle_tool_errors(graph: CompiledStateGraph) -> None:
    """Match prior create_react_agent ToolNode(handle_tool_errors=True) behavior."""
    tools_node = graph.nodes.get("tools")
    if tools_node is None:
        return
    bound = getattr(tools_node, "bound", tools_node)
    node = getattr(bound, "afunc", None) or getattr(bound, "func", None) or bound
    tool_node = node.__self__ if hasattr(node, "__self__") else node
    if isinstance(tool_node, ToolNode):
        tool_node._handle_tool_errors = True


def compile_chat_graph(checkpointer: BaseCheckpointSaver | None) -> CompiledStateGraph:
    """Compile the shared chat agent (single graph for all requests; milestone context via config)."""
    # ToolNode must include every tool the model may bind; binding is request-scoped below.
    all_tools = [
        *chat_tools_list(
            include_post_image=True,
            workflow_id=True,
            milestone_id=True,
            location_id=True,
        ),
        *_STORY_SCRATCHPAD_TOOLS,
    ]
    # Placeholder model — overridden per request by _select_chat_model_and_tools.
    placeholder_llm = chat_llm_for_gateway_model(None, streaming=True)
    graph = create_agent(
        model=placeholder_llm,
        tools=all_tools,
        middleware=[_dynamic_chat_prompt, _select_chat_model_and_tools],
        state_schema=ChatAgentState,
        checkpointer=checkpointer,
        name="menuyukti_chat",
    )
    _enable_handle_tool_errors(graph)
    return graph


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
