"""GraphQL: create/update `milestonedata` node under a milestone."""

from __future__ import annotations

from typing import Any

import httpx
from agents_app.agents.graphql_base import graphql_post

_NODES_QUERY = """
query Nodes($locationId: Int!, $nodeType: String, $parentId: ID, $first: Int) {
  nodes(locationId: $locationId, nodeType: $nodeType, parentId: $parentId, first: $first) {
    id
    nodeType
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


async def upsert_milestonedata(
    milestone_id: str,
    location_id: int,
    text: str,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    """Create or update the single `milestonedata` child under the milestone."""

    data = await graphql_post(
        client,
        _NODES_QUERY,
        {
            "locationId": location_id,
            "nodeType": "milestonedata",
            "parentId": milestone_id,
            "first": 500,
        },
        user_id,
    )
    raw_nodes = data.get("nodes")
    rows: list[dict[str, Any]] = []
    if isinstance(raw_nodes, list):
        for item in raw_nodes:
            if isinstance(item, dict) and str(item.get("nodeType", "")) == "milestonedata":
                rows.append(item)

    if not rows:
        gql = await graphql_post(
            client,
            _CREATE_NODE_MUTATION,
            {
                "locationId": location_id,
                "nodeType": "milestonedata",
                "parentId": milestone_id,
                "name": "Data",
                "data": {"data": text},
            },
            user_id,
        )
        node = gql.get("createNode")
        if not isinstance(node, dict):
            msg = "createNode returned invalid payload"
            raise RuntimeError(msg)
        return node

    primary, *rest = rows
    for extra in rest:
        eid = extra.get("id")
        if eid is not None:
            await graphql_post(client, _DELETE_NODE_MUTATION, {"id": str(eid)}, user_id)

    pid = primary.get("id")
    if pid is None:
        msg = "milestonedata node missing id"
        raise RuntimeError(msg)
    upd = await graphql_post(
        client,
        _UPDATE_NODE_MUTATION,
        {"id": str(pid), "data": {"data": text}},
        user_id,
    )
    node = upd.get("updateNode")
    if not isinstance(node, dict):
        msg = "updateNode returned invalid payload"
        raise RuntimeError(msg)
    return node
