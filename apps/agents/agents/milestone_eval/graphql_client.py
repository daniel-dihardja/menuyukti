"""Async GraphQL client for milestone evaluation (same auth headers as web app)."""

from __future__ import annotations

import os
from typing import Any, cast

import httpx

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


def _endpoint() -> str:
    url = os.environ.get("GRAPHQL_ENDPOINT", "").strip()
    if not url:
        msg = "GRAPHQL_ENDPOINT is not set"
        raise RuntimeError(msg)
    return url


def _headers(user_id: str) -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    key = os.environ.get("GRAPHQL_INTERNAL_API_KEY", "").strip()
    if key:
        headers["X-Internal-Api-Key"] = key
    headers["X-User-Id"] = user_id
    return headers


async def _post(
    client: httpx.AsyncClient,
    query: str,
    variables: dict[str, Any],
    user_id: str,
) -> dict[str, Any]:
    res = await client.post(
        _endpoint(),
        json={"query": query, "variables": variables},
        headers=_headers(user_id),
        timeout=60.0,
    )
    res.raise_for_status()
    body = cast(dict[str, Any], res.json())
    errors = body.get("errors")
    if errors:
        first = errors[0] if isinstance(errors, list) and errors else {}
        msg = (
            str(first.get("message", "GraphQL error"))
            if isinstance(first, dict)
            else "GraphQL error"
        )
        raise RuntimeError(msg)
    data = body.get("data")
    if not isinstance(data, dict):
        msg = "GraphQL returned no data"
        raise RuntimeError(msg)
    return data


async def fetch_milestone_children(
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> list[dict[str, Any]]:
    """Return all child nodes under the milestone (goal, milestonedata, passcriteria, result)."""

    async def _run(c: httpx.AsyncClient) -> list[dict[str, Any]]:
        data = await _post(
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
        data = await _post(
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
        data = await _post(c, _DELETE_NODE_MUTATION, {"id": node_id}, user_id)
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
        gql = await _post(
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
