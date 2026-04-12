"""Dynamic workspace API adapter tools (parameterless GET per configured row)."""

from __future__ import annotations

import logging
from typing import Any

import httpx
from agents_app.agents.http.safe_egress import adapter_http_get
from langchain_core.tools import BaseTool, StructuredTool

_logger = logging.getLogger(__name__)


def _make_workspace_adapter_tool(
    tool_key: str,
    endpoint_url: str,
    description: str,
    *,
    http_client: httpx.AsyncClient,
) -> BaseTool:
    desc = (description or "").strip() or f"GET workspace-configured endpoint for {tool_key}."
    if "GET" not in desc.upper():
        desc += " Performs an HTTP GET only; returns JSON or plain text."

    async def _adapter_fetch() -> str:
        body, err = await adapter_http_get(endpoint_url, client=http_client)
        if err:
            _logger.warning(
                "milestone_run workspace adapter GET failed tool_key=%s url=%s error=%s",
                tool_key,
                endpoint_url,
                err,
            )
            return f"Adapter request failed: {err}"
        return body if body is not None else ""

    return StructuredTool.from_function(
        coroutine=_adapter_fetch,
        name=tool_key,
        description=desc,
    )


def make_workspace_adapter_tools(
    context: dict[str, Any],
    *,
    http_client: httpx.AsyncClient,
) -> list[BaseTool]:
    raw_adapters = context.get("api_adapter_tools", [])
    adapters: list[dict[str, Any]] = raw_adapters if isinstance(raw_adapters, list) else []
    adapter_tools: list[BaseTool] = []
    for row in adapters:
        if not isinstance(row, dict):
            continue
        tk = row.get("tool_key")
        endpoint = row.get("url")
        if not isinstance(tk, str) or not tk.strip():
            continue
        if not isinstance(endpoint, str) or not endpoint.strip():
            continue
        d = row.get("description", "")
        desc_str = d if isinstance(d, str) else ""
        adapter_tools.append(
            _make_workspace_adapter_tool(
                tk.strip(),
                endpoint.strip(),
                desc_str,
                http_client=http_client,
            )
        )
    return adapter_tools
