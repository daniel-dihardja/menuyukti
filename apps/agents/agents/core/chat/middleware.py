"""Chat agent middleware: prompt, model/tools selection, retry, usage, tool errors."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from agents_app.agents.core.ai_usage_client import record_ai_usage_event, usage_from_model_result
from agents_app.agents.core.chat.http_context import chat_http_client_var
from agents_app.agents.core.chat.limits import (
    CHAT_HISTORY_LOG_MESSAGE_THRESHOLD,
    CHAT_HISTORY_MAX_TOKENS,
)
from agents_app.agents.core.chat.prompts import build_system_prompt
from agents_app.agents.core.chat.tools_registry import (
    chat_tools_list_from_config,
    has_analytics_run_id,
    has_ig_studio_post_context,
    has_leonardo_image_generation,
)
from agents_app.agents.core.llm_invoke import (
    DEFAULT_BASE_DELAY_S,
    DEFAULT_MAX_ATTEMPTS,
    is_retryable_llm_error,
)
from agents_app.models.llm_config import chat_llm_for_gateway_model
from langchain.agents.middleware import (
    ModelRequest,
    ToolCallRequest,
    dynamic_prompt,
    wrap_model_call,
    wrap_tool_call,
)
from langchain_core.messages import ToolMessage
from langchain_core.messages.utils import trim_messages
from langgraph.config import get_config
from langgraph.types import Command

_logger = logging.getLogger(__name__)


def chat_system_prompt_from_config() -> str:
    """Build the chat system prompt from RunnableConfig.configurable."""
    cfg = get_config() or {}
    conf = cfg.get("configurable") or {}
    conf_dict = conf if isinstance(conf, dict) else {}
    raw_mode = conf_dict.get("chat_mode")
    chat_mode = raw_mode if isinstance(raw_mode, str) else None
    raw_format = conf_dict.get("image_format")
    image_format = raw_format if isinstance(raw_format, str) else None
    return build_system_prompt(
        ig_studio_post_image=has_ig_studio_post_context(conf_dict),
        leonardo_image_generation=has_leonardo_image_generation(conf_dict),
        include_chart_catalog=has_analytics_run_id(conf_dict),
        chat_mode=chat_mode,
        image_format=image_format,
    )


@dynamic_prompt  # type: ignore[arg-type]
async def dynamic_chat_prompt(_request: ModelRequest) -> str:
    return chat_system_prompt_from_config()


def trim_chat_messages(messages: list[Any]) -> list[Any]:
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
async def select_chat_model_and_tools(request: ModelRequest, handler: Any) -> Any:
    """Resolve LLM + request-scoped tools from RunnableConfig (set by HTTP router).

    Order vs other middleware: touches model/tools/messages only; dynamic_prompt sets
    system_message separately — fields are disjoint so ordering is safe.
    """
    cfg = get_config() or {}
    conf = cfg.get("configurable") or {}
    conf_dict = conf if isinstance(conf, dict) else {}
    raw = conf_dict.get("chat_gateway_model")
    gateway: str | None = raw.strip() if isinstance(raw, str) and raw.strip() else None
    user_raw = conf_dict.get("user_id")
    reporting_user = (
        user_raw.strip() if isinstance(user_raw, str) and user_raw.strip() else None
    )
    mode_raw = conf_dict.get("chat_mode")
    mode = mode_raw.strip() if isinstance(mode_raw, str) and mode_raw.strip() else "general"
    reporting_tags = ["feature:chat", f"mode:{mode}"]
    llm = chat_llm_for_gateway_model(
        gateway,
        streaming=True,
        reporting_user=reporting_user,
        reporting_tags=reporting_tags,
    )
    bound_tools = chat_tools_list_from_config(conf_dict)
    trimmed = trim_chat_messages(list(request.messages))
    return await handler(request.override(model=llm, tools=bound_tools, messages=trimmed))


@wrap_model_call  # type: ignore[arg-type]
async def retry_chat_model_call(request: ModelRequest, handler: Any) -> Any:
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


@wrap_model_call  # type: ignore[arg-type]
async def record_chat_llm_usage(request: ModelRequest, handler: Any) -> Any:
    """Append a best-effort ai_gateway usage row after each successful model call."""
    result = await handler(request)
    cfg = get_config() or {}
    conf = cfg.get("configurable") or {}
    conf_dict = conf if isinstance(conf, dict) else {}
    user_raw = conf_dict.get("user_id")
    user_id = user_raw.strip() if isinstance(user_raw, str) and user_raw.strip() else ""
    client = chat_http_client_var.get(None)
    if not user_id or client is None:
        return result

    model_raw = conf_dict.get("chat_gateway_model")
    model = model_raw.strip() if isinstance(model_raw, str) and model_raw.strip() else None
    mode_raw = conf_dict.get("chat_mode")
    mode = mode_raw.strip() if isinstance(mode_raw, str) and mode_raw.strip() else "general"
    tokens = usage_from_model_result(result)
    await record_ai_usage_event(
        client,
        user_id=user_id,
        provider="ai_gateway",
        feature="chat",
        status="succeeded",
        model=model,
        units=1,
        metadata={
            "mode": mode,
            "input_tokens": tokens["input_tokens"],
            "output_tokens": tokens["output_tokens"],
            "total_tokens": tokens["total_tokens"],
        },
    )
    return result


@wrap_tool_call  # type: ignore[call-overload]
async def handle_tool_errors(
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


# Backward-compatible private aliases for tests that imported underscore names from graph.
_dynamic_chat_prompt = dynamic_chat_prompt
_select_chat_model_and_tools = select_chat_model_and_tools
_retry_chat_model_call = retry_chat_model_call
_record_chat_llm_usage = record_chat_llm_usage
_handle_tool_errors = handle_tool_errors
_chat_system_prompt_from_config = chat_system_prompt_from_config
