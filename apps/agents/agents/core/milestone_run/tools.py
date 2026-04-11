"""LangChain tools for milestone run: read goal/criteria/data, write milestonedata."""

from __future__ import annotations

import json
import logging
from typing import Any

_logger = logging.getLogger(__name__)

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_public_holidays_for_milestone,
    upsert_milestonedata_node,
)
from agents_app.agents.http.safe_egress import adapter_http_get
from langchain_core.tools import BaseTool, StructuredTool, tool


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


def make_milestone_run_tools(
    context: dict[str, Any],
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[BaseTool]:
    """Build bound tools that read/write :class:`~agents_app.agents.core.milestone_run.state.MilestoneRunState` fields.

    **Reads** use ``context`` (typically the LangGraph state dict): ``goal``, ``raw_data``, ``criteria``.

    **Writes** persist the Data tab via ``write_result_data`` (``result_data``, ``milestonedata_written``).
    Criterion verdicts, summary, and the result node are produced by the graph ``finalize_eval`` step.

    ``prior_milestones_data`` is prefetched when ``workflow_id`` is set on the run; use \
    ``read_prior_milestones_data`` to read it.

    Shared tool: ``get_public_holidays`` — callable from any skill that needs holidays for the \
    campaign location and date range (same implementation for all skills in the registry).

    When ``context`` includes ``api_adapter_tools`` (from GraphQL), one parameterless GET tool per \
    active row is appended (LangChain name = ``tool_key``). See :func:`adapter_http_get` for HTTPS vs dev HTTP.
    """

    @tool
    def read_goal() -> str:
        """Return the milestone goal text (from the goal child node, loaded into context)."""
        g = context.get("goal", "")
        return g if isinstance(g, str) else str(g)

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

    @tool
    def read_data() -> str:
        """Return the current milestone Data tab content (Markdown in the milestonedata node)."""
        updated = context.get("result_data", "")
        if isinstance(updated, str) and updated.strip():
            return updated
        d = context.get("raw_data", "")
        return d if isinstance(d, str) else str(d)

    @tool
    def read_prior_milestones_data() -> str:
        """Return Markdown from earlier milestones in this workflow (their Data tabs).

        Call when the current Data tab is missing context (e.g. campaign dates) that a previous
        milestone should have set. Empty or unavailable if the run was not scoped to a workflow.
        """
        d = context.get("prior_milestones_data", "")
        if isinstance(d, str) and d.strip():
            return d
        return "No prior milestone data available."

    @tool
    async def get_public_holidays(start_date: str, end_date: str) -> str:
        """Shared tool: fetch public holidays for this location's country (YYYY-MM-DD range).

        Reusable across milestone skills. Returns a Markdown bullet list (date, name, local name) or a short \
        message if none apply, the country is unknown, or the range is invalid. Use with ``write_result_data`` \
        when holidays must be filled in the Data tab.
        """
        holidays, err = await fetch_public_holidays_for_milestone(
            location_id,
            start_date.strip(),
            end_date.strip(),
            user_id,
            client=client,
        )
        if err:
            return err
        if not holidays:
            return "No public holidays in this date range (confirmed)."
        lines: list[str] = []
        for h in holidays:
            if not isinstance(h, dict):
                continue
            d = h.get("date", "")
            name = h.get("name", "")
            local_name = h.get("localName", "")
            extra = f" ({local_name})" if local_name and str(local_name) != str(name) else ""
            lines.append(f"- **{d}** — {name}{extra}")
        return "Public holidays in range:\n\n" + "\n".join(lines)

    @tool
    async def write_result_data(new_data: str) -> str:
        """Upsert the milestonedata child under this milestone with the given Markdown body.

        Updates context ``result_data`` and returns a short confirmation including the node id.
        """
        node = await upsert_milestonedata_node(
            milestone_id,
            location_id,
            new_data,
            user_id,
            client=client,
        )
        nid = str(node.get("id", ""))
        context["result_data"] = new_data
        context["milestonedata_written"] = True
        return f"Saved milestonedata node id={nid} ({len(new_data)} characters)."

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
                http_client=client,
            )
        )

    return [
        read_goal,
        read_criteria,
        read_data,
        read_prior_milestones_data,
        get_public_holidays,
        write_result_data,
        *adapter_tools,
    ]
