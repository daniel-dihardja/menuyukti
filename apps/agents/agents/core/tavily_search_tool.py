"""Optional Tavily web search tool (requires ``TAVILY_API_KEY``)."""

from __future__ import annotations

import json
import os
from typing import Any

from langchain_core.tools import BaseTool, tool
from langchain_tavily import TavilySearch

# Bound at tool construction; Tavily does not allow raising max_results per invoke.
_MAX_RESULTS = 5
_SEARCH_DEPTH = "basic"


def make_search_web_tool() -> BaseTool | None:
    """Return a LangChain tool named ``search_web`` when ``TAVILY_API_KEY`` is set; else ``None``.

    Uses Tavily's hosted search API (bounded egress). Prefer milestone context and
    ``read_prior_milestones_data`` before calling the open web.
    """
    key = os.environ.get("TAVILY_API_KEY", "").strip()
    if not key:
        return None

    inner = TavilySearch(
        tavily_api_key=key,
        max_results=_MAX_RESULTS,
        search_depth=_SEARCH_DEPTH,
        include_answer=False,
        include_raw_content=False,
    )

    @tool
    async def search_web(query: str) -> str:
        """Search the public web for current facts, trends, competitors, or regulations.

        Prefer milestone goal, criteria, prior milestones data, and internal GraphQL-backed
        tools first. Use when fresh external sources with citations (URLs and snippets) are
        required. Keep the query focused (one topic per call).
        """
        stripped = query.strip()
        if not stripped:
            return "Error: empty search query."
        out = await inner.ainvoke({"query": stripped})
        return _format_tavily_tool_result(out)

    return search_web


def _format_tavily_tool_result(out: Any) -> str:
    if isinstance(out, str):
        return out
    try:
        return json.dumps(out, ensure_ascii=False, indent=2)
    except (TypeError, ValueError):
        return repr(out)
