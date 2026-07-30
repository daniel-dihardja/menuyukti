"""Convert LangGraph checkpoint messages into UIMessage-shaped DTOs for chat history."""

from __future__ import annotations

import re
import uuid
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage

HISTORY_MESSAGE_CAP = 100

# BFF-injected LLM-only sections (must stay aligned with web strip-llm-only-chat-sections).
_LLM_ONLY_SECTION_PREFIXES = (
    "## Attached media library photos",
    "## Preset data —",
    "## Visualization data —",
)
_ATTACHED_FILENAME_LINE_RE = re.compile(r"^\d+\.\s+(\S.+)$")


def strip_llm_only_chat_sections(text: str) -> tuple[str, list[str]]:
    """Remove BFF-injected markdown sections; return (visible_text, attached_filenames)."""
    raw = text or ""
    if not raw.strip():
        return "", []

    chunks = re.split(r"\n\n+", raw)
    kept: list[str] = []
    attached: list[str] = []

    for chunk in chunks:
        trimmed = chunk.lstrip()
        if any(trimmed.startswith(prefix) for prefix in _LLM_ONLY_SECTION_PREFIXES):
            if trimmed.startswith(_LLM_ONLY_SECTION_PREFIXES[0]):
                for line in chunk.split("\n"):
                    match = _ATTACHED_FILENAME_LINE_RE.match(line)
                    if match:
                        name = match.group(1).strip()
                        if name and name not in attached:
                            attached.append(name)
            continue
        kept.append(chunk)

    return "\n\n".join(kept).strip(), attached


def _message_id(msg: BaseMessage) -> str:
    raw = getattr(msg, "id", None)
    if isinstance(raw, str) and raw.strip():
        return raw.strip()
    return str(uuid.uuid4())


def _text_from_content(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict) and block.get("type") == "text":
                text = block.get("text")
                if isinstance(text, str) and text:
                    parts.append(text)
        return "".join(parts)
    return ""


def _tool_call_name(tool_call: object) -> str | None:
    if isinstance(tool_call, dict):
        name = tool_call.get("name")
        return name if isinstance(name, str) and name else None
    name = getattr(tool_call, "name", None)
    return name if isinstance(name, str) and name else None


def _tool_call_id(tool_call: object) -> str:
    if isinstance(tool_call, dict):
        raw = tool_call.get("id")
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
    else:
        raw = getattr(tool_call, "id", None)
        if isinstance(raw, str) and raw.strip():
            return raw.strip()
    return str(uuid.uuid4())


def _tool_call_args(tool_call: object) -> dict[str, Any]:
    if isinstance(tool_call, dict):
        args = tool_call.get("args")
        return args if isinstance(args, dict) else {}
    args = getattr(tool_call, "args", None)
    return args if isinstance(args, dict) else {}


def _tool_message_output(msg: ToolMessage) -> str:
    content = getattr(msg, "content", None)
    if isinstance(content, str):
        return content
    if content is None:
        return ""
    try:
        import json

        return json.dumps(content, ensure_ascii=False)
    except (TypeError, ValueError):
        return str(content)


def _media_type_from_filename(name: str) -> str:
    """MIME type from a media library filename (aligned with web mediaTypeFromFilename)."""
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext in ("jpg", "jpeg"):
        return "image/jpeg"
    if ext == "png":
        return "image/png"
    if ext == "webp":
        return "image/webp"
    if ext == "gif":
        return "image/gif"
    if ext == "avif":
        return "image/avif"
    if ext in ("tif", "tiff"):
        return "image/tiff"
    return "image/webp"


def _human_ui_message(msg: HumanMessage) -> dict[str, Any] | None:
    raw_text = _text_from_content(msg.content).strip()
    if not raw_text:
        return None
    text, attached_names = strip_llm_only_chat_sections(raw_text)
    parts: list[dict[str, Any]] = []
    if text:
        parts.append({"type": "text", "text": text})
    for name in attached_names:
        parts.append(
            {
                "type": "file",
                "filename": name,
                "mediaType": _media_type_from_filename(name),
            }
        )
    if not parts:
        return None
    return {
        "id": _message_id(msg),
        "role": "user",
        "parts": parts,
    }


def _assistant_ui_message(
    msg: AIMessage,
    tool_outputs: dict[str, ToolMessage],
) -> dict[str, Any]:
    parts: list[dict[str, Any]] = []
    text = _text_from_content(msg.content)
    if text:
        parts.append({"type": "text", "text": text})

    for tool_call in msg.tool_calls or []:
        name = _tool_call_name(tool_call)
        if not name:
            continue
        tool_call_id = _tool_call_id(tool_call)
        tool_msg = tool_outputs.get(tool_call_id)
        part: dict[str, Any] = {
            "type": f"tool-{name}",
            "toolCallId": tool_call_id,
            "state": "output-available" if tool_msg is not None else "input-available",
            "input": _tool_call_args(tool_call),
        }
        if tool_msg is not None:
            part["output"] = _tool_message_output(tool_msg)
        parts.append(part)

    return {
        "id": _message_id(msg),
        "role": "assistant",
        "parts": parts,
    }


def langchain_messages_to_ui_messages(
    messages: list[BaseMessage] | None,
    *,
    cap: int = HISTORY_MESSAGE_CAP,
) -> list[dict[str, Any]]:
    """Convert checkpoint LC messages into AI SDK UIMessage-shaped dicts."""
    if not messages:
        return []

    out: list[dict[str, Any]] = []
    i = 0
    while i < len(messages):
        msg = messages[i]
        if isinstance(msg, HumanMessage):
            ui = _human_ui_message(msg)
            if ui is not None:
                out.append(ui)
            i += 1
            continue

        if isinstance(msg, AIMessage):
            tool_outputs: dict[str, ToolMessage] = {}
            j = i + 1
            while j < len(messages) and isinstance(messages[j], ToolMessage):
                tool_msg = messages[j]
                assert isinstance(tool_msg, ToolMessage)
                raw_id = getattr(tool_msg, "tool_call_id", None)
                if isinstance(raw_id, str) and raw_id.strip():
                    tool_outputs[raw_id.strip()] = tool_msg
                j += 1
            out.append(_assistant_ui_message(msg, tool_outputs))
            i = j
            continue

        # Skip orphan ToolMessages / system / other
        i += 1

    if cap > 0 and len(out) > cap:
        return out[-cap:]
    return out


def normalize_story_assets(raw: object) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        name = item.get("name")
        if role not in ("style", "content", "result"):
            continue
        if not isinstance(name, str) or not name.strip():
            continue
        note = item.get("note")
        out.append(
            {
                "role": role,
                "name": name.strip(),
                "note": note if isinstance(note, str) else "",
            }
        )
    return out
