"""LangChain tool: fetch public holidays for the milestone location."""

from __future__ import annotations

import httpx
from agents_app.agents.core.milestone_run.graphql_client import (
    fetch_public_holidays_for_milestone,
)
from langchain_core.tools import BaseTool, tool


def make_get_public_holidays_tool(
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> BaseTool:
    @tool
    async def get_public_holidays(start_date: str, end_date: str) -> str:
        """Shared tool: fetch public holidays for this location's country (YYYY-MM-DD range).

        Reusable across milestone skills. Returns a Markdown bullet list (date, name, local name) or a short \
        message if none apply, the country is unknown, or the range is invalid. Use with ``write_result_data`` \
        when holidays must be filled in milestone data.
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

    return get_public_holidays
