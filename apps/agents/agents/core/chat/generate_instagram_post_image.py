"""LangChain tool: generate an Instagram post image via the web ``/api/posts/generate`` BFF."""

from __future__ import annotations

import json
import os
from typing import Annotated, Any

from agents_app.agents.core.chat.http_context import get_chat_http_client
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import InjectedToolArg, tool

GENERATE_PATH = "/api/posts/generate"
# Leonardo poll can take up to ~2 minutes; leave headroom for S3 + GraphQL.
GENERATE_TIMEOUT_S = 180.0


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


@tool
async def generate_instagram_post_image(
    prompt: str,
    config: Annotated[RunnableConfig, InjectedToolArg()] = None,  # type: ignore[assignment]
) -> str:
    """Generate an Instagram post image with Leonardo using the composed prompt.

    Use this when the user asks to generate, create, or regenerate a post image in IG Studio.
    Compose a clear image-generation prompt from the conversation (subject, layout, text on image,
    mood). Model, format, quality, style, and reference images come from the Post Creator UI —
    do not ask the user to restate those settings unless they want to change them in the UI first.
    """
    trimmed = prompt.strip() if isinstance(prompt, str) else ""
    if not trimmed:
        return "Error: prompt must be a non-empty string."
    if len(trimmed) > 3000:
        return "Error: prompt must be at most 3000 characters."

    c = _configurable(config)
    user_id = c.get("user_id")
    post_id = c.get("post_id")
    page_id = c.get("page_id")

    if not user_id:
        return "Error: user context is missing. Cannot generate an image."
    if not post_id or not page_id:
        return (
            "Error: IG Studio post context is missing (post_id / page_id). "
            "Open a saved post in Post Creator to generate images from chat."
        )

    base = _web_app_url()
    api_key = _internal_api_key()
    if not base:
        return "Error: WEB_APP_URL is not configured on the agents service."
    if not api_key:
        return "Error: GRAPHQL_INTERNAL_API_KEY is not configured on the agents service."

    body: dict[str, Any] = {
        "prompt": trimmed,
        "postId": str(post_id),
        "pageId": str(page_id),
    }
    model = c.get("generation_model")
    if isinstance(model, str) and model.strip():
        body["model"] = model.strip()
    image_format = c.get("image_format")
    if isinstance(image_format, str) and image_format.strip():
        body["format"] = image_format.strip()
    image_quality = c.get("image_quality")
    if isinstance(image_quality, str) and image_quality.strip():
        body["quality"] = image_quality.strip()
    style_id = c.get("style_id")
    if isinstance(style_id, int) and style_id > 0:
        body["styleId"] = style_id
    references = c.get("generation_references")
    if isinstance(references, list) and references:
        body["references"] = references

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

    result = {
        "url": url_out,
        "name": name if isinstance(name, str) else None,
        "mediaS3Key": media_s3_key if isinstance(media_s3_key, str) else None,
        "createdAt": created_at if isinstance(created_at, str) else None,
        "prompt": trimmed,
    }
    return json.dumps(result, ensure_ascii=False)
