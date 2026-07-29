"""Story image assistant scratchpad: labeled style/product photo refs in graph state."""

from __future__ import annotations

import json
import re
from typing import Any, Literal

from agents_app.agents.core.chat.state import StoryAssetRef
from langchain.messages import ToolMessage
from langchain.tools import ToolRuntime, tool
from langgraph.types import Command

# Keep in sync with apps/web/lib/assets/storage.ts isSafePhotoFilename / MAX_GENERATION_REFERENCES.
MAX_STORY_ASSETS = 6
_SAFE_PHOTO_FILENAME_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
    r"\.(webp|jpg|jpeg|png|gif|avif|tif|tiff)$",
    re.IGNORECASE,
)

StoryAssetRole = Literal["style", "product"]
StoryAssetActionOp = Literal["save", "clear"]


def is_safe_photo_filename(name: str) -> bool:
    """True when ``name`` matches the workspace media-library photo filename rules."""
    return bool(isinstance(name, str) and _SAFE_PHOTO_FILENAME_RE.match(name.strip()))


def _normalize_assets(raw: Any) -> list[StoryAssetRef]:
    if not isinstance(raw, list):
        return []
    out: list[StoryAssetRef] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        name = item.get("name")
        note = item.get("note")
        if role not in ("style", "product"):
            continue
        if not isinstance(name, str) or not name.strip():
            continue
        out.append(
            {
                "role": role,
                "name": name.strip(),
                "note": note.strip() if isinstance(note, str) else "",
            }
        )
    return out


def story_assets_tool_payload(
    *,
    ok: bool,
    action: StoryAssetActionOp,
    story_assets: list[StoryAssetRef],
    message: str,
) -> str:
    """JSON ToolMessage content for UI chips + compact tool status."""
    return json.dumps(
        {
            "ok": ok,
            "action": action,
            "story_assets": story_assets,
            "message": message,
        },
        ensure_ascii=False,
    )


def upsert_story_asset_list(
    assets: list[StoryAssetRef],
    *,
    role: StoryAssetRole,
    name: str,
    note: str = "",
) -> tuple[list[StoryAssetRef] | None, str]:
    """Upsert by ``(role, name)``. Returns ``(next_list, message)``; ``None`` list on error."""
    trimmed_name = name.strip() if isinstance(name, str) else ""
    if not is_safe_photo_filename(trimmed_name):
        return None, (
            "Error: name must be a media-library photo filename "
            "(uuid + image extension). Ask the user to attach via @ from the media library."
        )
    if role not in ("style", "product"):
        return None, "Error: role must be 'style' or 'product'."

    trimmed_note = note.strip() if isinstance(note, str) else ""
    next_list = list(assets)
    for i, existing in enumerate(next_list):
        if existing["role"] == role and existing["name"] == trimmed_name:
            next_list[i] = {"role": role, "name": trimmed_name, "note": trimmed_note}
            return next_list, f"Updated {role} asset {trimmed_name}."

    if len(next_list) >= MAX_STORY_ASSETS:
        return None, (
            f"Error: at most {MAX_STORY_ASSETS} story assets can be saved. "
            "Clear one with clear_story_assets before adding another."
        )

    next_list.append({"role": role, "name": trimmed_name, "note": trimmed_note})
    return next_list, f"Saved {role} asset {trimmed_name}."


def clear_story_asset_list(
    assets: list[StoryAssetRef],
    *,
    role: StoryAssetRole | None = None,
    name: str | None = None,
) -> tuple[list[StoryAssetRef] | None, str]:
    """Clear by filename, by role, or all.

    Returns ``(next_list, message)``; ``None`` list on validation error.
    """
    if name is not None:
        trimmed = name.strip() if isinstance(name, str) else ""
        if not is_safe_photo_filename(trimmed):
            return None, (
                "Error: name must be a media-library photo filename "
                "(uuid + image extension)."
            )
        next_list = [a for a in assets if a["name"] != trimmed]
        if len(next_list) == len(assets):
            return next_list, f"No story asset named {trimmed} to clear."
        return next_list, f"Cleared story asset {trimmed}."

    if role is None:
        return [], "Cleared all story assets."
    if role not in ("style", "product"):
        return None, "Error: role must be 'style', 'product', or omitted to clear all."
    next_list = [a for a in assets if a["role"] != role]
    return next_list, f"Cleared story assets with role={role}."


def photo_references_from_story_assets(
    assets: list[StoryAssetRef] | list[dict[str, Any]] | None,
) -> list[dict[str, str]]:
    """Leonardo ``{type: photo, name}`` refs from scratchpad (dedupe by name, max 6)."""
    refs: list[dict[str, str]] = []
    seen: set[str] = set()
    for asset in _normalize_assets(assets):
        name = asset["name"]
        if name in seen:
            continue
        if not is_safe_photo_filename(name):
            continue
        seen.add(name)
        refs.append({"type": "photo", "name": name})
        if len(refs) >= MAX_STORY_ASSETS:
            break
    return refs


def merge_generation_references(
    *,
    story_assets: list[StoryAssetRef] | list[dict[str, Any]] | None,
    request_references: list[Any] | None,
) -> list[dict[str, str]] | None:
    """Merge scratchpad + request refs; scratchpad wins on name dedupe; cap at 6."""
    merged: list[dict[str, str]] = []
    seen: set[str] = set()

    for ref in photo_references_from_story_assets(story_assets):
        name = ref["name"]
        if name in seen:
            continue
        seen.add(name)
        merged.append(ref)

    if isinstance(request_references, list):
        for item in request_references:
            if len(merged) >= MAX_STORY_ASSETS:
                break
            if not isinstance(item, dict):
                continue
            if item.get("type") != "photo":
                continue
            raw_name = item.get("name")
            if not isinstance(raw_name, str) or not raw_name.strip():
                continue
            name = raw_name.strip()
            if name in seen:
                continue
            if not is_safe_photo_filename(name):
                continue
            seen.add(name)
            merged.append({"type": "photo", "name": name})

    return merged or None


def apply_clear_story_assets(
    assets: list[StoryAssetRef] | list[dict[str, Any]] | None,
    *,
    role: StoryAssetRole | None = None,
    name: str | None = None,
) -> tuple[list[StoryAssetRef] | None, str, str]:
    """Apply clear and return ``(next_list|None, human_message, json_payload)``."""
    current = _normalize_assets(assets)
    next_list, message = clear_story_asset_list(current, role=role, name=name)
    if next_list is None:
        return None, message, story_assets_tool_payload(
            ok=False, action="clear", story_assets=current, message=message
        )
    return (
        next_list,
        message,
        story_assets_tool_payload(
            ok=True, action="clear", story_assets=next_list, message=message
        ),
    )


@tool
def save_story_asset(
    role: StoryAssetRole,
    name: str,
    note: str = "",
    runtime: ToolRuntime = None,  # type: ignore[assignment]
) -> Command | str:
    """Save a labeled style or product photo from the media library into Story scratchpad.

    Call when the user attaches (via @) or confirms a media-library filename as the style
    direction reference (role=style) or a product/dish photo (role=product). ``name`` must be
    the library filename (uuid + extension), not a raw data URL. Optional ``note`` describes
    how to use the image in the Leonardo prompt.
    """
    if runtime is None or not runtime.tool_call_id:
        return "Error: tool runtime unavailable."

    current = _normalize_assets((runtime.state or {}).get("story_assets"))
    next_list, message = upsert_story_asset_list(current, role=role, name=name, note=note)
    if next_list is None:
        return story_assets_tool_payload(
            ok=False, action="save", story_assets=current, message=message
        )

    payload = story_assets_tool_payload(
        ok=True, action="save", story_assets=next_list, message=message
    )
    return Command(
        update={
            "story_assets": next_list,
            "messages": [ToolMessage(content=payload, tool_call_id=runtime.tool_call_id)],
        }
    )


@tool
def clear_story_assets(
    role: StoryAssetRole | None = None,
    name: str | None = None,
    runtime: ToolRuntime = None,  # type: ignore[assignment]
) -> Command | str:
    """Clear saved Story style/product photo refs from the scratchpad.

    Pass ``name`` to remove one media-library filename. Pass ``role`` (style|product) to clear
    that role. Omit both to clear all.
    """
    if runtime is None or not runtime.tool_call_id:
        return "Error: tool runtime unavailable."

    current = _normalize_assets((runtime.state or {}).get("story_assets"))
    next_list, message, payload = apply_clear_story_assets(current, role=role, name=name)
    if next_list is None:
        return payload

    return Command(
        update={
            "story_assets": next_list,
            "messages": [ToolMessage(content=payload, tool_call_id=runtime.tool_call_id)],
        }
    )
