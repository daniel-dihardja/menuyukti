"""Async GraphQL client for milestone evaluation (same auth headers as web app)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post

_NODES_QUERY = """
query Nodes($locationId: Int!, $parentId: ID) {
  nodes(locationId: $locationId, parentId: $parentId) {
    id
    name
    nodeType
    parentId
    locationId
    data
  }
}
"""

_UPDATE_NODE_MUTATION = """
mutation UpdateNode($id: ID!, $data: JSON) {
  updateNode(id: $id, data: $data) {
    id
    nodeType
    data
  }
}
"""

_DELETE_NODE_MUTATION = """
mutation DeleteNode($id: ID!) {
  deleteNode(id: $id)
}
"""

_CREATE_NODE_MUTATION = """
mutation CreateNode(
  $locationId: Int!
  $nodeType: String!
  $name: String
  $description: String
  $data: JSON
  $parentId: ID
) {
  createNode(
    locationId: $locationId
    nodeType: $nodeType
    name: $name
    description: $description
    data: $data
    parentId: $parentId
  ) {
    id
    nodeType
    data
    parentId
    locationId
  }
}
"""


async def fetch_milestone_children(
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> list[dict[str, Any]]:
    """Return all child nodes under the milestone (goal, milestonedata, passcriteria, result)."""

    async def _run(c: httpx.AsyncClient) -> list[dict[str, Any]]:
        data = await graphql_post(
            c,
            _NODES_QUERY,
            {"locationId": location_id, "parentId": milestone_id},
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

    if client is not None:
        return await _run(client)
    async with httpx.AsyncClient() as c:
        return await _run(c)


async def update_passcriteria_status(
    node_id: str,
    status: str,
    user_id: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    """Set passcriteria `status` to pass or fail."""

    async def _run(c: httpx.AsyncClient) -> dict[str, Any]:
        data = await graphql_post(
            c,
            _UPDATE_NODE_MUTATION,
            {"id": node_id, "data": {"status": status}},
            user_id,
        )
        node = data.get("updateNode")
        if not isinstance(node, dict):
            msg = "updateNode returned invalid payload"
            raise RuntimeError(msg)
        return node

    if client is not None:
        return await _run(client)
    async with httpx.AsyncClient() as c:
        return await _run(c)


async def delete_node(
    node_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> bool:
    async def _run(c: httpx.AsyncClient) -> bool:
        data = await graphql_post(c, _DELETE_NODE_MUTATION, {"id": node_id}, user_id)
        return bool(data.get("deleteNode"))

    if client is not None:
        return await _run(client)
    async with httpx.AsyncClient() as c:
        return await _run(c)


async def create_result_node(
    milestone_id: str,
    location_id: int,
    data: dict[str, Any],
    user_id: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> dict[str, Any]:
    async def _run(c: httpx.AsyncClient) -> dict[str, Any]:
        gql = await graphql_post(
            c,
            _CREATE_NODE_MUTATION,
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

    if client is not None:
        return await _run(client)
    async with httpx.AsyncClient() as c:
        return await _run(c)
