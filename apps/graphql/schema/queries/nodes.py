import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types import NodeType


def _node_to_gql(row: Node) -> NodeType:
    return NodeType(
        id=str(row.id),
        name=row.name,
        description=row.description,
        node_type=row.node_type,
        path=row.path,
        parent_id=str(row.parent_id) if row.parent_id is not None else None,
        location_id=row.location_id,
        data=row.data,
    )


@strawberry.type
class NodesQuery:
    @strawberry.field
    def nodes(
        self,
        info: strawberry.Info,
        location_id: int,
        node_type: str | None = None,
    ) -> list[NodeType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        session = SessionLocal()
        try:
            if not is_location_owner(session, location_id, user_id):
                return []
            q = session.query(Node).filter(Node.location_id == location_id)
            if node_type is not None:
                q = q.filter(Node.node_type == node_type)
            rows = q.order_by(Node.created_at.desc()).all()
            return [_node_to_gql(r) for r in rows]
        finally:
            session.close()

    @strawberry.field
    def node(self, info: strawberry.Info, id: strawberry.ID) -> NodeType | None:
        user_id = user_id_from_info(info)
        if not user_id:
            return None
        session = SessionLocal()
        try:
            try:
                node_pk = int(str(id))
            except ValueError:
                return None
            if node_pk < 1:
                return None
            row = session.get(Node, node_pk)
            if row is None or row.location_id is None:
                return None
            if not is_location_owner(session, row.location_id, user_id):
                return None
            return _node_to_gql(row)
        finally:
            session.close()
