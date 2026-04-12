"""LangChain tool: read pass/fail criteria from run context."""

from __future__ import annotations

import json
from typing import Any

from langchain_core.tools import BaseTool, tool


def make_read_criteria_tool(context: dict[str, Any]) -> BaseTool:
    @tool
    def read_criteria() -> str:
        """Return pass/fail criteria as a JSON array of objects with id and requirement strings."""
        raw = context.get("criteria", [])
        if not isinstance(raw, list):
            return "[]"
        out: list[dict[str, str]] = []
        for item in raw:
            if isinstance(item, dict):
                out.append(
                    {
                        "id": str(item.get("id", "")),
                        "requirement": str(item.get("requirement", "")),
                    }
                )
        return json.dumps(out, ensure_ascii=False, indent=2)

    return read_criteria
