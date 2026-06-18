import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Node
from graphql.limits import (
    DEFAULT_NODES_FIRST,
    MAX_NODES_FIRST,
    clamp_page_size,
)
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.node_gql import node_to_gql
from graphql.schema.node_handlers.milestone import _milestone_sort_key
from graphql.schema.types import NodeType


@strawberry.type
class NodesQuery:
    @strawberry.field(
        description=(
            "List nodes for a location, optionally filtered by nodeType and/or parentId. "
            "Results are paginated with `first` (default and max 500). When parentId is omitted, "
            "use `afterId` (last-seen node id) for cursor pagination in primary-key-desc order "
            "(aligned with creation order for autoincrement ids)."
        )
    )
    def nodes(
        self,
        info: strawberry.Info,
        location_id: int,
        node_type: str | None = None,
        parent_id: strawberry.ID | None = None,
        first: int | None = None,
        after_id: strawberry.ID | None = None,
    ) -> list[NodeType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        limit = clamp_page_size(first, default=DEFAULT_NODES_FIRST, maximum=MAX_NODES_FIRST)
        with request_session_scope(info) as session:
            if not is_location_owner(session, location_id, user_id, info=info):
                return []
            q = session.query(Node).filter(Node.location_id == location_id)
            if node_type is not None:
                q = q.filter(Node.node_type == node_type)
            if parent_id is not None:
                try:
                    parent_pk = int(str(parent_id))
                except ValueError:
                    return []
                if parent_pk < 1:
                    return []
                q = q.filter(Node.parent_id == parent_pk)
                rows = q.order_by(Node.created_at.asc()).limit(limit).all()
                rows.sort(key=_milestone_sort_key)
                return [node_to_gql(r) for r in rows]
            if after_id is not None:
                try:
                    after_pk = int(str(after_id))
                except ValueError:
                    return []
                if after_pk < 1:
                    return []
                cursor_row = session.get(Node, after_pk)
                if (
                    cursor_row is None
                    or cursor_row.location_id != location_id
                    or (node_type is not None and cursor_row.node_type != node_type)
                ):
                    return []
                # Id-based cursor avoids SQLite datetime bind vs stored string mismatches
                # (fractional seconds) that break composite created_at + id predicates.
                q = q.filter(Node.id < cursor_row.id)
            rows = q.order_by(Node.id.desc()).limit(limit).all()
            return [node_to_gql(r) for r in rows]

    @strawberry.field(description="Fetch a single node by id if the caller owns its location.")
    def node(self, info: strawberry.Info, id: strawberry.ID) -> NodeType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        with request_session_scope(info) as session:
            try:
                node_pk = int(str(id))
            except ValueError:
                return None
            if node_pk < 1:
                return None
            row = session.get(Node, node_pk)
            if row is None or row.location_id is None:
                return None
            if not is_location_owner(session, row.location_id, user_id, info=info):
                return None
            return node_to_gql(row)
