"""Batched read: one workflow, its milestones, and typed children (SSR-friendly)."""

from collections import defaultdict

import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.node_handlers.milestone import _milestone_sort_key
from graphql.schema.queries.nodes import _node_to_gql
from graphql.schema.types import NodeType


@strawberry.type(
    description="A milestone node plus its passcriteria, milestonedata, and result children."
)
class MilestoneCampaignBundleType:
    milestone: NodeType
    pass_criteria_nodes: list[NodeType]
    milestonedata_nodes: list[NodeType]
    result_nodes: list[NodeType]


@strawberry.type(
    description=(
        "Workflow campaign tree for SSR: workflow root, ordered milestones, "
        "and grouped child nodes per milestone (single round-trip vs many `nodes` calls)."
    )
)
class WorkflowCampaignTreeType:
    workflow: NodeType
    milestones: list[MilestoneCampaignBundleType]


_CHILD_TYPES = frozenset({"passcriteria", "milestonedata", "result"})


@strawberry.type
class WorkflowCampaignTreeQuery:
    @strawberry.field(
        description=(
            "Load a workflow node, its milestones (ordered like `nodes`), and each milestone's "
            "passcriteria/milestonedata/result children. Returns null if the id is missing, "
            "not a workflow, or not owned by the caller."
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

        with SessionLocal() as session:
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
            milestone_ids = [m.id for m in milestone_rows]

            buckets: dict[int, dict[str, list[Node]]] = defaultdict(lambda: defaultdict(list))
            if milestone_ids:
                child_rows = (
                    session.query(Node)
                    .filter(
                        Node.location_id == location_id,
                        Node.parent_id.in_(milestone_ids),
                        Node.node_type.in_(_CHILD_TYPES),
                    )
                    .all()
                )
                for row in child_rows:
                    buckets[row.parent_id][row.node_type].append(row)
                for mid in milestone_ids:
                    for nt in _CHILD_TYPES:
                        buckets[mid][nt].sort(key=_milestone_sort_key)

            bundles: list[MilestoneCampaignBundleType] = []
            for m in milestone_rows:
                b = buckets[m.id]
                bundles.append(
                    MilestoneCampaignBundleType(
                        milestone=_node_to_gql(m),
                        pass_criteria_nodes=[_node_to_gql(r) for r in b["passcriteria"]],
                        milestonedata_nodes=[_node_to_gql(r) for r in b["milestonedata"]],
                        result_nodes=[_node_to_gql(r) for r in b["result"]],
                    )
                )

            return WorkflowCampaignTreeType(
                workflow=_node_to_gql(workflow_row),
                milestones=bundles,
            )
