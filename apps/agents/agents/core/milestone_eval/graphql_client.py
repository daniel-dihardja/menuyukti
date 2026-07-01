"""Async GraphQL client for milestone evaluation (same auth headers as web app)."""

from __future__ import annotations

import json
from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post
from agents_app.agents.graphql_operations import (
    DEFAULT_NODES_FIRST,
    DELETE_NODE_MUTATION,
    NODE_BY_ID_QUERY,
    NODES_QUERY,
    PRIOR_MILESTONES_MILESTONE_DATA_QUERY,
    SET_PASS_CRITERIA_STATUSES_MUTATION,
    SET_PASS_CRITERION_STATUS_MUTATION,
    UPDATE_NODE_MUTATION,
)


async def fetch_milestone_children(
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[dict[str, Any]]:
    """Return child nodes under the milestone (usually empty after milestone-first migration)."""

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
    """Return milestone node row including typed milestone columns or None."""

    async def _run(c: httpx.AsyncClient) -> dict[str, Any] | None:
        data = await graphql_post(c, NODE_BY_ID_QUERY, {"id": milestone_id}, user_id)
        raw = data.get("node")
        return raw if isinstance(raw, dict) else None

    return await _run(client)


async def update_milestone_passcriteria_status(
    milestone_id: str,
    location_id: int,
    criterion_id: str,
    status: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Atomically set status for one criterion on ``pass_criterias`` JSON."""
    data = await graphql_post(
        client,
        SET_PASS_CRITERION_STATUS_MUTATION,
        {
            "milestoneId": milestone_id,
            "locationId": location_id,
            "criterionId": criterion_id,
            "status": status,
        },
        user_id,
    )
    if not data.get("setPassCriterionStatus"):
        msg = "setPassCriterionStatus failed"
        raise RuntimeError(msg)


async def update_milestone_passcriteria_statuses(
    milestone_id: str,
    location_id: int,
    updates: list[dict[str, str]],
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Batch-update pass criterion statuses in one mutation."""
    if not updates:
        return
    data = await graphql_post(
        client,
        SET_PASS_CRITERIA_STATUSES_MUTATION,
        {
            "milestoneId": milestone_id,
            "locationId": location_id,
            "updates": [{"criterionId": item["id"], "status": item["status"]} for item in updates],
        },
        user_id,
    )
    if not data.get("setPassCriteriaStatuses"):
        msg = "setPassCriteriaStatuses failed"
        raise RuntimeError(msg)


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


async def upsert_result_node(
    *,
    result_node_id: str | None,
    milestone_id: str,
    location_id: int,
    data: dict[str, Any],
    user_id: str,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Persist eval output on ``milestone_result`` (``result_node_id`` ignored)."""
    _ = result_node_id
    _ = location_id
    gql = await graphql_post(
        client,
        UPDATE_NODE_MUTATION,
        {"id": milestone_id, "data": {"milestoneResult": data}},
        user_id,
    )
    node = gql.get("updateNode")
    if not isinstance(node, dict):
        msg = "updateNode returned invalid payload"
        raise RuntimeError(msg)
    return node


async def fetch_prior_milestones_data_for_eval(
    workflow_id: str,
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> str:
    """Return JSON text of prior milestones' preset data (empty when unavailable)."""

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
