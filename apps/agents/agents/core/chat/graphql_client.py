"""GraphQL helpers for chat milestone features (goal, pass criteria, milestonedata)."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post

_NODE_QUERY = """
query Node($id: ID!) {
  node(id: $id) {
    id
    name
    nodeType
    parentId
    locationId
    data
  }
}
"""

_NODES_QUERY = """
query Nodes($locationId: Int!, $nodeType: String, $parentId: ID, $first: Int) {
  nodes(locationId: $locationId, nodeType: $nodeType, parentId: $parentId, first: $first) {
    id
    name
    nodeType
    parentId
    locationId
    data
  }
}
"""

_NODES_BY_PARENT_QUERY = """
query NodesByParent($locationId: Int!, $parentId: ID, $first: Int) {
  nodes(locationId: $locationId, parentId: $parentId, first: $first) {
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


def _pass_criterion_display_name(requirement: str) -> str:
    t = requirement.strip()
    if not t:
        return "Pass criterion"
    return t[:497] + "..." if len(t) > 500 else t


async def fetch_milestone_node(
    milestone_id: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any] | None:
    """Return the milestone node row (name, locationId, data JSON) or None."""
    data = await graphql_post(client, _NODE_QUERY, {"id": milestone_id}, user_id)
    raw = data.get("node")
    return raw if isinstance(raw, dict) else None


def _node_type(ch: dict[str, Any]) -> str:
    return str(ch.get("nodeType") or ch.get("node_type") or "")


async def fetch_milestone_children(
    milestone_id: str,
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[dict[str, Any]]:
    """Child nodes under the milestone (goal, milestonedata, passcriteria, result)."""
    data = await graphql_post(
        client,
        _NODES_BY_PARENT_QUERY,
        {"locationId": location_id, "parentId": milestone_id, "first": 500},
        user_id,
    )
    raw = data.get("nodes")
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, dict)]


async def upsert_goal_node(
    milestone_id: str,
    location_id: int,
    goal_text: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Create or update the single `goal` child; empty text deletes goal nodes."""
    data = await graphql_post(
        client,
        _NODES_QUERY,
        {
            "locationId": location_id,
            "nodeType": "goal",
            "parentId": milestone_id,
            "first": 500,
        },
        user_id,
    )
    raw_nodes = data.get("nodes")
    rows: list[dict[str, Any]] = []
    if isinstance(raw_nodes, list):
        for item in raw_nodes:
            if isinstance(item, dict) and _node_type(item) == "goal":
                rows.append(item)

    if not goal_text.strip():
        for g in rows:
            gid = g.get("id")
            if gid is not None:
                await graphql_post(client, _DELETE_NODE_MUTATION, {"id": str(gid)}, user_id)
        return

    if not rows:
        gql = await graphql_post(
            client,
            _CREATE_NODE_MUTATION,
            {
                "locationId": location_id,
                "nodeType": "goal",
                "parentId": milestone_id,
                "name": "Goal",
                "data": {"goal": goal_text},
            },
            user_id,
        )
        node = gql.get("createNode")
        if not isinstance(node, dict):
            msg = "createNode returned invalid payload"
            raise RuntimeError(msg)
        return

    primary, *rest = rows
    for extra in rest:
        eid = extra.get("id")
        if eid is not None:
            await graphql_post(client, _DELETE_NODE_MUTATION, {"id": str(eid)}, user_id)

    pid = primary.get("id")
    if pid is None:
        msg = "goal node missing id"
        raise RuntimeError(msg)
    upd = await graphql_post(
        client,
        _UPDATE_NODE_MUTATION,
        {"id": str(pid), "data": {"goal": goal_text}},
        user_id,
    )
    node = upd.get("updateNode")
    if not isinstance(node, dict):
        msg = "updateNode returned invalid payload"
        raise RuntimeError(msg)


async def replace_pass_criteria(
    milestone_id: str,
    location_id: int,
    requirements: list[str],
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> None:
    """Delete all passcriteria children and create new rows with status ``open``."""
    data = await graphql_post(
        client,
        _NODES_QUERY,
        {
            "locationId": location_id,
            "nodeType": "passcriteria",
            "parentId": milestone_id,
            "first": 500,
        },
        user_id,
    )
    raw_nodes = data.get("nodes")
    if isinstance(raw_nodes, list):
        for item in raw_nodes:
            if not isinstance(item, dict):
                continue
            if _node_type(item) != "passcriteria":
                continue
            nid = item.get("id")
            if nid is not None:
                await graphql_post(client, _DELETE_NODE_MUTATION, {"id": str(nid)}, user_id)

    for req in requirements:
        r = req.strip()
        if not r:
            continue
        display = _pass_criterion_display_name(r)
        gql = await graphql_post(
            client,
            _CREATE_NODE_MUTATION,
            {
                "locationId": location_id,
                "nodeType": "passcriteria",
                "parentId": milestone_id,
                "name": display,
                "data": {"requirement": r, "status": "open"},
            },
            user_id,
        )
        node = gql.get("createNode")
        if not isinstance(node, dict):
            msg = "createNode returned invalid payload for passcriteria"
            raise RuntimeError(msg)
