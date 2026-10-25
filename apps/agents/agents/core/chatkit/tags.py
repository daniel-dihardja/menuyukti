"""Convert ChatKit @-mention tags into LangChain-friendly text / context."""

from __future__ import annotations

from typing import Any


def describe_tag_for_model(tag_id: str, tag_text: str, data: dict[str, Any] | None) -> str:
    """Produce a short markdown block the model can treat as trusted mention context."""
    payload = data or {}
    kind = payload.get("kind")
    if kind == "visualization":
        viz_id = payload.get("visualizationId") or tag_id
        title = tag_text or viz_id
        return f"<VISUALIZATION_TAG>\nID: {viz_id}\nTitle: {title}\n</VISUALIZATION_TAG>"
    if kind == "media":
        name = payload.get("name") or tag_id
        title = tag_text or name
        collection = payload.get("collection")
        lines = [
            "<MEDIA_TAG>",
            f"Name: {name}",
            f"Title: {title}",
        ]
        if collection:
            lines.append(f"Collection: {collection}")
        lines.append("</MEDIA_TAG>")
        return "\n".join(lines)
    return f"<ENTITY_TAG>\nID: {tag_id}\nTitle: {tag_text}\n</ENTITY_TAG>"


def enrich_user_text_with_tags(content: list[Any]) -> str:
    """Build the HumanMessage text including expanded tag descriptions."""
    chunks: list[str] = []
    for part in content:
        ptype = getattr(part, "type", None)
        if ptype == "input_text":
            text = getattr(part, "text", "")
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())
        elif ptype == "input_tag":
            tag_id = str(getattr(part, "id", "") or "")
            tag_text = str(getattr(part, "text", "") or "")
            data = getattr(part, "data", None)
            data_dict = data if isinstance(data, dict) else {}
            chunks.append(describe_tag_for_model(tag_id, tag_text, data_dict))
    return "\n\n".join(chunks).strip()


def referenced_media_names_from_content(content: list[Any]) -> list[str]:
    names: list[str] = []
    for part in content:
        if getattr(part, "type", None) != "input_tag":
            continue
        data = getattr(part, "data", None)
        if not isinstance(data, dict) or data.get("kind") != "media":
            continue
        name = data.get("name")
        if isinstance(name, str) and name.strip():
            names.append(name.strip())
    return names


def referenced_visualization_id_from_content(content: list[Any]) -> str | None:
    for part in content:
        if getattr(part, "type", None) != "input_tag":
            continue
        data = getattr(part, "data", None)
        if not isinstance(data, dict) or data.get("kind") != "visualization":
            continue
        viz_id = data.get("visualizationId") or getattr(part, "id", None)
        if isinstance(viz_id, str) and viz_id.strip():
            return viz_id.strip()
    return None
