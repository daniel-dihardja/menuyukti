"""Human-readable formatting for milestone JSON shown in campaign chat (e.g. /input, /data)."""

from __future__ import annotations

import re
from typing import Any


def _humanize_key(key: str) -> str:
    step = key.replace("_", " ")
    step = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", step)
    return " ".join(part.capitalize() for part in step.split() if part)


def _format_scalar(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return "-"
        if "_" in stripped and not any(c.isupper() for c in stripped):
            return stripped.replace("_", " ").title()
        return stripped
    return str(value)


def _format_list_lines(items: list[Any], indent: str) -> list[str]:
    if not items:
        return [f"{indent}- —"]

    if all(isinstance(x, dict) for x in items):
        lines: list[str] = []
        for i, obj in enumerate(items, start=1):
            lines.append(f"{indent}- **Item {i}**")
            for nk, nv in obj.items():
                lines.extend(_lines_for_kv(nk, nv, indent + "  "))
        return lines

    lines = []
    for i, x in enumerate(items, start=1):
        if isinstance(x, dict):
            lines.append(f"{indent}- **Item {i}**")
            for nk, nv in x.items():
                lines.extend(_lines_for_kv(nk, nv, indent + "  "))
        elif isinstance(x, list):
            lines.append(f"{indent}- **Item {i}**")
            lines.extend(_format_list_lines(x, indent + "  "))
        else:
            lines.append(f"{indent}- {_format_scalar(x)}")
    return lines


def _lines_for_kv(key: str, value: Any, indent: str) -> list[str]:
    label = _humanize_key(key)
    if isinstance(value, dict):
        if not value:
            return [f"{indent}- **{label}:** —"]
        lines = [f"{indent}- **{label}:**"]
        for nk, nv in value.items():
            lines.extend(_lines_for_kv(nk, nv, indent + "  "))
        return lines
    if isinstance(value, list):
        if not value:
            return [f"{indent}- **{label}:** —"]
        lines = [f"{indent}- **{label}:**"]
        lines.extend(_format_list_lines(value, indent + "  "))
        return lines
    return [f"{indent}- **{label}:** {_format_scalar(value)}"]


def format_payload_for_chat(payload: Any, *, indent: str = "") -> str:
    """Format arbitrary JSON-like payload as markdown bullet lines for restaurant marketers."""
    if isinstance(payload, dict):
        lines: list[str] = []
        has_type = "type" in payload
        has_value = "value" in payload
        if has_type or has_value:
            type_val = payload.get("type")
            if type_val is not None and str(type_val).strip() != "":
                lines.append(f"{indent}- **{_humanize_key('type')}:** {_format_scalar(type_val)}")
            value_val = payload.get("value")
            if isinstance(value_val, dict):
                for nk, nv in value_val.items():
                    lines.extend(_lines_for_kv(nk, nv, indent))
            elif value_val is not None:
                lines.extend(_lines_for_kv("value", value_val, indent))
            for k, v in payload.items():
                if k in ("type", "value"):
                    continue
                lines.extend(_lines_for_kv(k, v, indent))
            return "\n".join(lines)

        for k, v in payload.items():
            lines.extend(_lines_for_kv(k, v, indent))
        return "\n".join(lines)

    if isinstance(payload, list):
        return "\n".join(_format_list_lines(payload, indent))

    return f"{indent}{_format_scalar(payload)}"
