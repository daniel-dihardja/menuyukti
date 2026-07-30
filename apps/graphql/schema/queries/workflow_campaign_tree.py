"""Batched read: one workflow, its milestones (SSR-friendly)."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Node
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.node_gql import node_to_gql
from graphql.schema.types import NodeType


def _milestone_sort_key(row: Node) -> tuple[int, object, int]:
    """Sort milestones: primary `data.order` (int), then created_at, then id."""
    d = row.data if isinstance(row.data, dict) else {}
    raw = d.get("order")
    order = raw if isinstance(raw, int) else 0
    return (order, row.created_at or 0, row.id)


@strawberry.type(
    description="A milestone node under a workflow (legacy rows may still exist in the DB)."
)
class MilestoneCampaignBundleType:
    milestone: NodeType


@strawberry.type(
    description=(
        "Workflow campaign tree for SSR: workflow root, ordered milestones "
        "(single round-trip vs many `nodes` calls)."
    )
)
class WorkflowCampaignTreeType:
    workflow: NodeType
    milestones: list[MilestoneCampaignBundleType]


@strawberry.type
class WorkflowCampaignTreeQuery:
    @strawberry.field(
        description=(
            "Load a workflow node, its milestones (ordered like `nodes`). "
            "Returns null if the id is missing, not a workflow, or not owned by the caller."
        )
    )
    def workflow_campaign_tree(
        self,
        info: strawberry.Info,
        workflow_id: strawberry.ID,
    ) -> WorkflowCampaignTreeType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        try:
            workflow_pk = int(str(workflow_id))
        except ValueError:
            return None
        if workflow_pk < 1:
            return None

        with request_session_scope(info) as session:
            workflow_row = session.get(Node, workflow_pk)
            if (
                workflow_row is None
                or workflow_row.location_id is None
                or workflow_row.node_type != "workflow"
            ):
                return None
            if not is_location_owner(session, workflow_row.location_id, user_id):
                return None

            location_id = workflow_row.location_id
            milestone_rows = (
                session.query(Node)
                .filter(
                    Node.location_id == location_id,
                    Node.parent_id == workflow_pk,
                    Node.node_type == "milestone",
                )
                .order_by(Node.created_at.asc())
                .all()
            )
            milestone_rows.sort(key=_milestone_sort_key)

            bundles: list[MilestoneCampaignBundleType] = []
            for m in milestone_rows:
                bundles.append(MilestoneCampaignBundleType(milestone=node_to_gql(m)))

            return WorkflowCampaignTreeType(
                workflow=node_to_gql(workflow_row),
                milestones=bundles,
            )
