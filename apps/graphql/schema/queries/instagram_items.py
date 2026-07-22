"""Query Instagram items for a workflow."""

from __future__ import annotations

import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import InstagramItem, Node
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.instagram_items_common import item_to_gql, parse_positive_id
from graphql.schema.types.instagram_item import InstagramItemType


@strawberry.type
class InstagramItemsQuery:
    @strawberry.field(
        description=(
            "Instagram items for a workflow the caller owns, "
            "earliest schedule first (unscheduled last)."
        )
    )
    def instagram_items(
        self,
        info: strawberry.Info,
        workflow_id: strawberry.ID,
    ) -> list[InstagramItemType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        try:
            workflow_pk = parse_positive_id(workflow_id, label="workflow id")
        except ValueError:
            return []

        with request_session_scope(info) as session:
            workflow = session.get(Node, workflow_pk)
            if workflow is None or workflow.node_type != "workflow":
                return []
            if workflow.location_id is None:
                return []
            if not is_location_owner(session, workflow.location_id, user_id):
                return []
            rows = (
                session.query(InstagramItem)
                .filter(InstagramItem.workflow_id == workflow_pk)
                .order_by(
                    InstagramItem.schedule.asc().nulls_last(),
                    InstagramItem.id.asc(),
                )
                .all()
            )
            return [item_to_gql(row) for row in rows]

    @strawberry.field(description="A single Instagram item owned via its workflow location.")
    def instagram_item(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
    ) -> InstagramItemType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        try:
            item_pk = parse_positive_id(id, label="instagram item id")
        except ValueError:
            return None

        with request_session_scope(info) as session:
            row = session.get(InstagramItem, item_pk)
            if row is None:
                return None
            if not is_location_owner(session, row.location_id, user_id):
                return None
            return item_to_gql(row)
