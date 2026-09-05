"""Request-scoped chat tool registry (mode and config gates)."""

from __future__ import annotations

from typing import Any

from agents_app.agents.core.chat.generate_instagram_post_image import (
    generate_instagram_post_image,
)
from agents_app.agents.core.chat.inventory_refill_forecast import (
    get_inventory_refill_forecast,
)
from agents_app.agents.core.chat.present_weekly_instagram_schedule import (
    present_weekly_instagram_schedule,
)
from agents_app.agents.core.chat.request_story_generate_confirmation import (
    request_story_generate_confirmation,
)
from agents_app.agents.core.chat.story_assets import clear_story_assets, save_story_asset
from agents_app.agents.core.chat.tools import (
    get_chart_data,
    get_location_data,
    list_media,
    list_media_collections,
)
from agents_app.agents.core.tavily_search_tool import make_search_web_tool

STORY_SCRATCHPAD_TOOLS = [
    save_story_asset,
    clear_story_assets,
    request_story_generate_confirmation,
]


def has_ig_studio_post_context(conf: dict[str, Any]) -> bool:
    post_id = conf.get("post_id")
    page_id = conf.get("page_id")
    return bool(
        isinstance(post_id, str)
        and post_id.strip()
        and isinstance(page_id, str)
        and page_id.strip()
    )


def has_location_id(conf: dict[str, Any]) -> bool:
    return conf.get("location_id") is not None


def has_analytics_run_id(conf: dict[str, Any]) -> bool:
    return conf.get("analytics_run_id") is not None


def is_image_assistant_mode(conf: dict[str, Any]) -> bool:
    mode = conf.get("chat_mode")
    return mode in ("image_assistant", "story_image_assistant")


def is_inventar_mode(conf: dict[str, Any]) -> bool:
    return conf.get("chat_mode") == "inventar"


def has_agent_thread_id(conf: dict[str, Any]) -> bool:
    raw = conf.get("agent_thread_id")
    return isinstance(raw, str) and bool(raw.strip())


def has_leonardo_image_generation(conf: dict[str, Any]) -> bool:
    """Leonardo generate tool: IG Studio or agent-thread chat."""
    return has_ig_studio_post_context(conf) or has_agent_thread_id(conf)


def chat_tools_list(
    *,
    include_post_image: bool = False,
    location_id: bool = True,
    analytics_run: bool = False,
    image_assistant: bool = False,
    inventar: bool = False,
) -> list:
    """Build chat ReAct tools for the given request context.

    When ``location_id`` is False, location tools are omitted. Chart tools require
    ``analytics_run`` (pinned sales report). The ToolNode still registers the full
    union via ``chat_tools_list(include_post_image=True)`` plus Story scratchpad tools.

    In ``image_assistant`` mode only media-library tools, Story scratchpad tools,
    confirmation UI, and ``generate_instagram_post_image`` are bound.

    In ``inventar`` mode only refill forecast (+ location data when available).
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

    if inventar:
        tools: list = [get_inventory_refill_forecast]
        if location_id:
            tools.append(get_location_data)
        return tools

    tools = []
    tools.append(list_media_collections)
    tools.append(list_media)
    tools.append(present_weekly_instagram_schedule)
    if location_id:
        tools.append(get_location_data)
    if analytics_run:
        tools.append(get_chart_data)
    web = make_search_web_tool()
    if web is not None:
        tools.append(web)
    if include_post_image:
        tools.append(generate_instagram_post_image)
    return tools


def chat_tools_list_from_config(conf: dict[str, Any]) -> list:
    """Resolve request-scoped tools from RunnableConfig.configurable."""
    if is_image_assistant_mode(conf):
        return chat_tools_list(image_assistant=True)
    if is_inventar_mode(conf):
        return chat_tools_list(inventar=True, location_id=has_location_id(conf))
    return chat_tools_list(
        include_post_image=has_leonardo_image_generation(conf),
        location_id=has_location_id(conf),
        analytics_run=has_analytics_run_id(conf),
    )
