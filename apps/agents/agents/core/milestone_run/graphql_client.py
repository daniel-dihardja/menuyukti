"""GraphQL helpers for milestone run tools: upsert data + re-exports from milestone eval."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.core.milestone_data.graphql_client import upsert_milestonedata
from agents_app.agents.core.milestone_eval.graphql_client import (
    create_result_node,
    delete_node,
    fetch_milestone_children,
    update_passcriteria_status,
)
from agents_app.agents.graphql_base import graphql_post

_LOCATION_QUERY = """
query GetLocation($id: ID!) {
  location(id: $id) {
    id
    name
    country
  }
}
"""

_PUBLIC_HOLIDAYS_QUERY = """
query PublicHolidays($country: String!, $startDate: String!, $endDate: String!) {
  publicHolidays(country: $country, startDate: $startDate, endDate: $endDate) {
    id
    date
    name
    localName
    holidayType
    isTentative
  }
}
"""

_WORKFLOW_MILESTONES_QUERY = """
query WorkflowMilestones($locationId: Int!, $parentId: ID) {
  nodes(locationId: $locationId, parentId: $parentId) {
    id
    name
    nodeType
    data
  }
}
"""


def _milestone_sort_key(node: dict[str, Any]) -> tuple[int, str]:
    """Sort milestones by ``data.order`` then id (stable)."""
    o = None
    raw = node.get("data")
    data = raw if isinstance(raw, dict) else {}
    ord_raw = data.get("order")
    if isinstance(ord_raw, int):
        o = ord_raw
    oid = o if o is not None else 10**9
    return (oid, str(node.get("id", "")))


async def fetch_prior_milestones_data(
    milestone_id: str,
    workflow_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> str:
    """Build Markdown of each earlier milestone's Data tab (by ``order``), for the current milestone.

    Milestones under ``workflow_id`` are ordered by ``data.order``; content is taken from each prior
    milestone's ``milestonedata`` child.
    """
    data = await graphql_post(
        client,
        _WORKFLOW_MILESTONES_QUERY,
        {"locationId": location_id, "parentId": workflow_id},
        user_id,
    )
    raw_nodes = data.get("nodes")
    if not isinstance(raw_nodes, list):
        return ""
    milestones: list[dict[str, Any]] = []
    for item in raw_nodes:
        if isinstance(item, dict) and str(item.get("nodeType") or "") == "milestone":
            milestones.append(item)
    milestones.sort(key=_milestone_sort_key)
    idx = next((i for i, m in enumerate(milestones) if str(m.get("id")) == milestone_id), -1)
    if idx <= 0:
        return ""
    sections: list[str] = []
    for m in milestones[:idx]:
        mid = str(m.get("id", ""))
        if not mid:
            continue
        title = str(m.get("name") or "Milestone")
        children = await fetch_milestone_children(
            mid,
            location_id,
            user_id,
            client=client,
        )
        md_body = ""
        for ch in children:
            nt = str(ch.get("nodeType") or ch.get("node_type") or "")
            if nt != "milestonedata":
                continue
            raw_d = ch.get("data")
            d = raw_d if isinstance(raw_d, dict) else {}
            body = d.get("data")
            if isinstance(body, str):
                md_body = body
                break
        sections.append(f"## {title}\n\n{md_body}\n")
    return "\n".join(sections).strip()


__all__ = [
    "create_result_node",
    "delete_node",
    "fetch_milestone_children",
    "fetch_prior_milestones_data",
    "fetch_public_holidays_for_milestone",
    "update_passcriteria_status",
    "upsert_milestonedata_node",
]


async def fetch_public_holidays_for_milestone(
    location_id: int,
    start_date: str,
    end_date: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> tuple[list[dict[str, Any]], str | None]:
    """Resolve country from location then fetch public holidays.

    ``start_date`` and ``end_date`` are inclusive YYYY-MM-DD strings.

    Returns ``(holidays, error)``. ``error`` is set when the range is invalid, the location is
    missing, or the location has no country; otherwise ``error`` is ``None`` and ``holidays`` may
    be empty when there are no holidays in range.
    """
    sd = start_date.strip()
    ed = end_date.strip()
    if not sd or not ed or sd > ed:
        return [], "Invalid date range: start and end must be YYYY-MM-DD with start on or before end."

    data = await graphql_post(
        client,
        _LOCATION_QUERY,
        {"id": str(location_id)},
        user_id,
    )
    raw = data.get("location")
    if raw is None or not isinstance(raw, dict):
        return [], "Location not found."
    country = raw.get("country")
    if not country or not str(country).strip():
        return [], "No public holiday data available for this location (country not set)."

    data = await graphql_post(
        client,
        _PUBLIC_HOLIDAYS_QUERY,
        {
            "country": str(country).strip(),
            "startDate": sd,
            "endDate": ed,
        },
        user_id,
    )
    holidays = data.get("publicHolidays")
    if holidays is None:
        return [], None
    if not isinstance(holidays, list):
        return [], None
    return json.loads(json.dumps(holidays)), None


async def upsert_milestonedata_node(
    milestone_id: str,
    location_id: int,
    data: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Create or update the single ``milestonedata`` child under ``milestone_id``.

    ``data`` is the Markdown body stored in the node's ``data.data`` field.
    Delegates to :func:`agents_app.agents.core.milestone_data.graphql_client.upsert_milestonedata`.
    """
    return await upsert_milestonedata(
        milestone_id,
        location_id,
        data,
        user_id,
        client=client,
    )
