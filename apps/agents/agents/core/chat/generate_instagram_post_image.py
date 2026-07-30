"""LangChain tool: generate an Instagram post image via the web ``/api/posts/generate`` BFF."""

from __future__ import annotations

import json
import os
from typing import Annotated, Any

from agents_app.agents.core.chat.http_context import get_chat_http_client
from agents_app.agents.core.chat.story_assets import (
    merge_generation_references,
    upsert_result_asset,
)
from langchain.messages import ToolMessage
from langchain.tools import ToolRuntime
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolArg, tool
from langgraph.types import Command

GENERATE_PATH = "/api/posts/generate"
# Leonardo poll can take up to ~2 minutes; leave headroom for S3 + GraphQL.
GENERATE_TIMEOUT_S = 180.0

# Keep in sync with apps/web/lib/posts/leonardo-post-models.ts / leonardo-post-dimensions.ts
LEONARDO_POST_MODEL_IDS = frozenset(
    {
        "gemini-2.5-flash-image",
        "nano-banana-2",
        "gemini-image-2",
    }
)
POST_IMAGE_FORMAT_IDS = frozenset({"feed", "tall", "square", "story", "wide"})
POST_IMAGE_QUALITY_IDS = frozenset({"standard", "high", "ultra"})


def _web_app_url() -> str | None:
    raw = os.environ.get("WEB_APP_URL", "").strip()
    return raw.rstrip("/") if raw else None


def _internal_api_key() -> str | None:
    key = os.environ.get("GRAPHQL_INTERNAL_API_KEY", "").strip()
    return key or None


def _configurable(config: RunnableConfig | None) -> dict[str, Any]:
    if not config:
        return {}
    raw = config.get("configurable")
    return raw if isinstance(raw, dict) else {}


def _optional_str(value: Any) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _resolve_setting(
    tool_arg: Any,
    *,
    config_key: str,
    allowed: frozenset[str],
    configurable: dict[str, Any],
) -> str | None:
    """Prefer tool arg, then configurable; omit invalid values so the BFF applies defaults."""
    for candidate in (_optional_str(tool_arg), _optional_str(configurable.get(config_key))):
        if candidate is not None and candidate in allowed:
            return candidate
    return None


def _is_image_assistant_mode(configurable: dict[str, Any]) -> bool:
    mode = configurable.get("chat_mode")
    return mode in ("image_assistant", "story_image_assistant")


@tool
async def generate_instagram_post_image(
    prompt: str,
    format: str | None = None,
    model: str | None = None,
    quality: str | None = None,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
    runtime: ToolRuntime = None,  # type: ignore[assignment]
) -> Command | str:
    """Generate an image with Leonardo using a composed prompt.

    Use when the user asks to generate, create, or regenerate an image (workflow chat or
    IG Studio Post Creator). Compose a clear image-generation prompt from the conversation
    (subject, layout, text on image, mood). Optional ``format`` (feed|tall|square|story|wide),
    ``model``, and ``quality`` (standard|high|ultra) override UI/context defaults when set.
    In Post Creator, model/format/quality/style/references often come from the UI — do not ask
    the user to restate those unless they want to change them first. After success, briefly
    confirm; the image appears in chat (and updates the Post Creator preview when a saved
    post page is in context). In Image assistant mode, call only after the user explicitly
    confirms the collected-data plan (first generate); refine turns after a successful generate
    may call again from feedback. The output is also saved as the scratchpad ``result`` asset
    for later refine turns.
    """
    trimmed = prompt.strip() if isinstance(prompt, str) else ""
    if not trimmed:
        return "Error: prompt must be a non-empty string."
    if len(trimmed) > 3000:
        return "Error: prompt must be at most 3000 characters."

    c = _configurable(config)
    user_id = c.get("user_id")
    post_id = _optional_str(c.get("post_id"))
    page_id = _optional_str(c.get("page_id"))
    image_assistant = _is_image_assistant_mode(c)

    if not user_id:
        return "Error: user context is missing. Cannot generate an image."

    base = _web_app_url()
    api_key = _internal_api_key()
    if not base:
        return "Error: WEB_APP_URL is not configured on the agents service."
    if not api_key:
        return "Error: GRAPHQL_INTERNAL_API_KEY is not configured on the agents service."

    body: dict[str, Any] = {"prompt": trimmed}
    if post_id and page_id:
        body["postId"] = post_id
        body["pageId"] = page_id

    resolved_model = _resolve_setting(
        model, config_key="generation_model", allowed=LEONARDO_POST_MODEL_IDS, configurable=c
    )
    if resolved_model is not None:
        body["model"] = resolved_model

    # Image assistant: UI format is source of truth (prefer configurable over tool arg).
    if image_assistant:
        ui_format = _optional_str(c.get("image_format"))
        tool_format = _optional_str(format)
        if ui_format is not None and ui_format in POST_IMAGE_FORMAT_IDS:
            body["format"] = ui_format
        elif tool_format is not None and tool_format in POST_IMAGE_FORMAT_IDS:
            body["format"] = tool_format
        else:
            body["format"] = "story"
    else:
        resolved_format = _resolve_setting(
            format, config_key="image_format", allowed=POST_IMAGE_FORMAT_IDS, configurable=c
        )
        if resolved_format is not None:
            body["format"] = resolved_format

    resolved_quality = _resolve_setting(
        quality, config_key="image_quality", allowed=POST_IMAGE_QUALITY_IDS, configurable=c
    )
    if resolved_quality is not None:
        body["quality"] = resolved_quality

    style_id = c.get("style_id")
    if isinstance(style_id, int) and style_id > 0:
        body["styleId"] = style_id

    request_refs = c.get("generation_references")
    if image_assistant:
        story_assets = None
        if runtime is not None and isinstance(getattr(runtime, "state", None), dict):
            story_assets = runtime.state.get("story_assets")
        references = merge_generation_references(
            story_assets=story_assets if isinstance(story_assets, list) else None,
            request_references=request_refs if isinstance(request_refs, list) else None,
        )
        if references:
            body["references"] = references
    elif isinstance(request_refs, list) and request_refs:
        body["references"] = request_refs

    client = get_chat_http_client()
    url = f"{base}{GENERATE_PATH}"
    try:
        res = await client.post(
            url,
            headers={
                "Content-Type": "application/json",
                "X-Internal-Api-Key": api_key,
                "X-User-Id": str(user_id),
            },
            json=body,
            timeout=GENERATE_TIMEOUT_S,
        )
    except Exception as exc:  # noqa: BLE001 — surface transport errors to the model
        return f"Error: failed to reach web generate API ({exc})."

    text = res.text
    try:
        payload = res.json() if text else {}
    except Exception:  # noqa: BLE001
        payload = {}

    if res.status_code >= 400:
        message = payload.get("message") if isinstance(payload, dict) else None
        code = payload.get("code") if isinstance(payload, dict) else None
        detail = message if isinstance(message, str) and message else text or res.reason_phrase
        code_part = f" [{code}]" if isinstance(code, str) and code else ""
        return f"Error: generate failed ({res.status_code}){code_part}: {detail}"

    if not isinstance(payload, dict):
        return "Error: generate returned an unexpected response."

    url_out = payload.get("url")
    name = payload.get("name")
    media_s3_key = payload.get("mediaS3Key")
    created_at = payload.get("createdAt")
    if not isinstance(url_out, str) or not url_out:
        return "Error: generate response missing image url."

    result: dict[str, Any] = {
        "url": url_out,
        "name": name if isinstance(name, str) else None,
        "mediaS3Key": media_s3_key if isinstance(media_s3_key, str) else None,
        "createdAt": created_at if isinstance(created_at, str) else None,
        "prompt": trimmed,
    }

    if (
        image_assistant
        and isinstance(name, str)
        and name.strip()
        and runtime is not None
        and runtime.tool_call_id
    ):
        current = (runtime.state or {}).get("story_assets")
        next_list, _msg = upsert_result_asset(current, name=name)
        if next_list is not None:
            result["action"] = "save_result"
            result["story_assets"] = next_list
            return Command(
                update={
                    "story_assets": next_list,
                    "messages": [
                        ToolMessage(
                            content=json.dumps(result, ensure_ascii=False),
                            tool_call_id=runtime.tool_call_id,
                        )
                    ],
                }
            )

    return json.dumps(result, ensure_ascii=False)
