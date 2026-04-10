"""LangChain tools for milestone run: read goal/criteria/data, write milestonedata + result."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    create_result_node,
    delete_node,
    fetch_milestone_children,
    fetch_public_holidays_for_milestone,
    update_passcriteria_status,
    upsert_milestonedata_node,
)
from langchain_core.tools import BaseTool, tool


def _node_type(ch: dict[str, Any]) -> str:
    return str(ch.get("nodeType") or ch.get("node_type") or "")


def make_milestone_run_tools(
    context: dict[str, Any],
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
    include_write_result: bool = True,
) -> list[BaseTool]:
    """Build bound tools that read/write :class:`~agents_app.agents.core.milestone_run.state.MilestoneRunState` fields.

    **Reads** use ``context`` (typically the LangGraph state dict): ``goal``, ``raw_data``, ``criteria``.

    **Writes** persist via GraphQL and update ``context`` keys ``result_data``, ``result_summary``,
    ``result_node_id``, and ``last_criteria_verdicts`` (after ``write_result``).

    ``prior_milestones_data`` is prefetched when ``workflow_id`` is set on the run; use \
    ``read_prior_milestones_data`` to read it.

    When ``include_write_result`` is False (intermediate step in a multi-skill run), the
    ``write_result`` tool is omitted so only the Data tab can be updated until the final skill.

    Shared tool: ``get_public_holidays`` — callable from any skill that needs holidays for the \
    campaign location and date range (same implementation for all skills in the registry).
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
        message if none apply, the country is unknown, or the range is invalid. Use before write_result_data \
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

    @tool
    async def write_result(
        summary: str,
        criteria_verdicts: list[dict[str, Any]],
    ) -> str:
        """Create a new result node under this milestone (replaces any existing result).

        ``criteria_verdicts`` should list objects with keys: id, requirement, status (pass or fail), reasoning.
        Updates context ``result_summary`` and ``result_node_id`` and returns a short confirmation.
        """
        children = await fetch_milestone_children(
            milestone_id,
            location_id,
            user_id,
            client=client,
        )
        for ch in children:
            if _node_type(ch) == "result":
                rid = str(ch.get("id", ""))
                if rid:
                    await delete_node(rid, user_id, client=client)

        criteria_out: list[dict[str, str]] = []
        for v in criteria_verdicts:
            if not isinstance(v, dict):
                continue
            criteria_out.append(
                {
                    "id": str(v.get("id", "")),
                    "requirement": str(v.get("requirement", "")),
                    "status": str(v.get("status", "")),
                    "reasoning": str(v.get("reasoning", "")),
                }
            )

        passed = sum(1 for e in criteria_out if e.get("status") == "pass")
        total = len(criteria_out)

        for row in criteria_out:
            cid = row.get("id", "")
            st = str(row.get("status", ""))
            if cid and st in ("pass", "fail"):
                await update_passcriteria_status(cid, st, user_id, client=client)

        sse_criteria: list[dict[str, str]] = [
            {"id": str(e.get("id", "")), "status": str(e.get("status", ""))}
            for e in criteria_out
            if e.get("id")
        ]
        context["last_criteria_verdicts"] = sse_criteria

        payload = {
            "summary": summary,
            "passed": passed,
            "total": total,
            "criteria": criteria_out,
        }
        node = await create_result_node(
            milestone_id,
            location_id,
            payload,
            user_id,
            client=client,
        )
        nid = str(node.get("id", ""))
        context["result_summary"] = summary
        context["result_node_id"] = nid
        return f"Created result node id={nid} (passed {passed}/{total})."

    tools: list[BaseTool] = [
        read_goal,
        read_criteria,
        read_data,
        read_prior_milestones_data,
        get_public_holidays,
        write_result_data,
    ]
    if include_write_result:
        tools.append(write_result)
    return tools
