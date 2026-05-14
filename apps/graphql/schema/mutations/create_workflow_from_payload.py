"""Create a workflow root and milestone tree from a starter template payload."""

from __future__ import annotations

import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.node_gql import node_to_gql
from graphql.schema.types import NodeType
from graphql.services.workflow_seed import seed_workflow_from_payload


@strawberry.type
class CreateWorkflowFromPayloadMutation:
    @strawberry.mutation
    def create_workflow_from_payload(
        self,
        info: strawberry.Info,
        location_id: int,
        payload: JSON,
        analytics_run_id: int | None = None,
    ) -> NodeType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createWorkflowFromPayload")

        with SessionLocal() as session:
            require_location_owner(session, location_id, user_id)
            root_node = seed_workflow_from_payload(
                session,
                location_id,
                payload,
                analytics_run_id=analytics_run_id,
            )
            return node_to_gql(root_node)
