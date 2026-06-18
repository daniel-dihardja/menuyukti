"""Batch milestone display-order updates for a workflow."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Node
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.node_handlers import get_handler


@strawberry.input
class MilestoneOrderInput:
    milestone_id: strawberry.ID
    order: int


@strawberry.type
class ReorderMilestonesMutation:
    @strawberry.mutation
    def reorder_milestones(
        self,
        info: strawberry.Info,
        workflow_id: strawberry.ID,
        location_id: int,
        orders: list[MilestoneOrderInput],
    ) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for reorderMilestones")
        if not orders:
            return True

        try:
            wf_pk = int(str(workflow_id))
        except ValueError as e:
            raise ValueError("Invalid workflow id") from e
        if wf_pk < 1:
            raise ValueError("Invalid workflow id")

        with request_session_scope(info) as session:
            require_location_owner(session, location_id, user_id, info=info)
            root = session.get(Node, wf_pk)
            if root is None or root.node_type != "workflow":
                raise ValueError("Workflow not found")
            if root.location_id != location_id:
                raise ValueError("Workflow does not belong to this location")

            milestone_ids: list[int] = []
            order_by_id: dict[int, int] = {}
            for item in orders:
                try:
                    ms_pk = int(str(item.milestone_id))
                except ValueError as e:
                    raise ValueError("Invalid milestone id") from e
                if ms_pk < 1:
                    raise ValueError("Invalid milestone id")
                if item.order < 1:
                    raise ValueError("order must be >= 1")
                milestone_ids.append(ms_pk)
                order_by_id[ms_pk] = item.order

            rows = (
                session.query(Node)
                .filter(
                    Node.id.in_(milestone_ids),
                    Node.parent_id == wf_pk,
                    Node.node_type == "milestone",
                    Node.location_id == location_id,
                )
                .all()
            )
            if len(rows) != len(set(milestone_ids)):
                raise ValueError("One or more milestones not found in workflow")

            handler = get_handler("milestone")
            for row in rows:
                order_val = order_by_id[row.id]
                row.data = handler.merge_update_data(row, {"order": order_val})

            session.commit()
            return True
