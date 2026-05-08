"""Async GraphQL client for milestone evaluation (same auth headers as web app)."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    CREATE_NODE_MUTATION,
    DEFAULT_NODES_FIRST,
    DELETE_NODE_MUTATION,
    NODE_BY_ID_QUERY,
    NODES_QUERY,
    PRIOR_MILESTONES_MILESTONE_DATA_QUERY,
    UPDATE_NODE_MUTATION,
)


async def fetch_milestone_children(
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[dict[str, Any]]:
    """Return all child nodes under the milestone (goal, milestonedata, passcriteria, result)."""

    async def _run(c: httpx.AsyncClient) -> list[dict[str, Any]]:
        data = await graphql_post(
            c,
            NODES_QUERY,
            {
                "locationId": location_id,
                "nodeType": None,
                "parentId": milestone_id,
                "first": DEFAULT_NODES_FIRST,
            },
            user_id,
        )
        raw = data.get("nodes")
        if not isinstance(raw, list):
            return []
        out: list[dict[str, Any]] = []
        for item in raw:
            if isinstance(item, dict):
                out.append(item)
        return out

    return await _run(client)


async def fetch_milestone_node(
    milestone_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Return milestone node row (including `data.passCriterias`) or None."""

    async def _run(c: httpx.AsyncClient) -> dict[str, Any] | None:
        data = await graphql_post(c, NODE_BY_ID_QUERY, {"id": milestone_id}, user_id)
        raw = data.get("node")
        return raw if isinstance(raw, dict) else None

    return await _run(client)


async def update_milestone_passcriteria_status(
    milestone_id: str,
    criterion_id: str,
    status: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Set milestone.data.passCriterias[*].status by criterion id."""

    async def _run(c: httpx.AsyncClient) -> dict[str, Any]:
        row = await fetch_milestone_node(milestone_id, user_id, client=c)
        if not isinstance(row, dict):
            msg = "milestone not found"
            raise RuntimeError(msg)
        raw_data = row.get("data")
        data = raw_data if isinstance(raw_data, dict) else {}
        raw_pass = data.get("passCriterias")
        pass_rows = raw_pass if isinstance(raw_pass, list) else []
        next_pass: list[dict[str, Any]] = []
        found = False
        for item in pass_rows:
            if not isinstance(item, dict):
                continue
            cid = item.get("id")
            if not isinstance(cid, str) or not cid:
                continue
            req = item.get("requirement")
            current_status = item.get("status")
            if not isinstance(req, str) or not isinstance(current_status, str):
                continue
            next_item = {"id": cid, "requirement": req, "status": current_status}
            if cid == criterion_id:
                next_item["status"] = status
                found = True
            next_pass.append(next_item)
        if not found:
            msg = f"criterion not found: {criterion_id}"
            raise RuntimeError(msg)

        next_data = dict(data)
        next_data["passCriterias"] = next_pass
        data = await graphql_post(
            c,
            UPDATE_NODE_MUTATION,
            {"id": milestone_id, "data": next_data},
            user_id,
        )
        node = data.get("updateNode")
        if not isinstance(node, dict):
            msg = "updateNode returned invalid payload"
            raise RuntimeError(msg)
        return node

    return await _run(client)


async def delete_node(
    node_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> bool:
    async def _run(c: httpx.AsyncClient) -> bool:
        data = await graphql_post(c, DELETE_NODE_MUTATION, {"id": node_id}, user_id)
        return bool(data.get("deleteNode"))

    return await _run(client)


async def create_result_node(
    milestone_id: str,
    location_id: int,
    data: dict[str, Any],
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    async def _run(c: httpx.AsyncClient) -> dict[str, Any]:
        gql = await graphql_post(
            c,
            CREATE_NODE_MUTATION,
            {
                "locationId": location_id,
                "nodeType": "result",
                "name": "Result",
                "parentId": milestone_id,
                "data": data,
            },
            user_id,
        )
        node = gql.get("createNode")
        if not isinstance(node, dict):
            msg = "createNode returned invalid payload"
            raise RuntimeError(msg)
        return node

    return await _run(client)


async def upsert_result_node(
    *,
    result_node_id: str | None,
    milestone_id: str,
    location_id: int,
    data: dict[str, Any],
    user_id: str,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Update the existing result node when present, else create one."""
    if result_node_id:
        gql = await graphql_post(
            client,
            UPDATE_NODE_MUTATION,
            {"id": result_node_id, "data": data},
            user_id,
        )
        node = gql.get("updateNode")
        if not isinstance(node, dict):
            msg = "updateNode returned invalid payload"
            raise RuntimeError(msg)
        return node
    return await create_result_node(
        milestone_id,
        location_id,
        data,
        user_id,
        client=client,
    )


async def fetch_prior_milestones_data_for_eval(
    workflow_id: str,
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> str:
    """Return JSON text of prior milestones' milestonedata (empty when unavailable)."""

    async def _run(c: httpx.AsyncClient) -> str:
        data = await graphql_post(
            c,
            PRIOR_MILESTONES_MILESTONE_DATA_QUERY,
            {
                "workflowId": workflow_id,
                "milestoneId": milestone_id,
                "locationId": location_id,
            },
            user_id,
        )
        raw = data.get("priorMilestonesMilestoneData")
        if isinstance(raw, (list, dict)):
            return json.dumps(raw, ensure_ascii=False, indent=2).strip()
        if isinstance(raw, str):
            return raw.strip()
        return ""

    return await _run(client)
