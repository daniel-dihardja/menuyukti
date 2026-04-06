import strawberry

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types import NodeType


def _node_to_gql(node: Node) -> NodeType:
    return NodeType(
        id=str(node.id),
        name=node.name,
        description=node.description,
        node_type=node.node_type,
        path=node.path,
        parent_id=str(node.parent_id) if node.parent_id is not None else None,
        location_id=node.location_id,
        data=node.data,
    )


@strawberry.type
class UpdateNodeMutation:
    @strawberry.mutation
    def update_node(self, info: strawberry.Info, id: strawberry.ID, name: str) -> NodeType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateNode")

        display_name = name.strip()
        if not display_name:
            raise ValueError("Name cannot be empty")

        try:
            node_pk = int(str(id))
        except ValueError as e:
            raise ValueError("Invalid node id") from e
        if node_pk < 1:
            raise ValueError("Invalid node id")

        session = SessionLocal()
        try:
            node = session.get(Node, node_pk)
            if node is None:
                raise ValueError("Node not found")

            if node.location_id is None:
                raise ValueError("Node has no location")

            require_location_owner(session, node.location_id, user_id)

            if node.node_type != "milestone":
                raise ValueError("Only milestone names can be updated with this mutation")

            if node.parent_id is None:
                raise ValueError("Milestone has no parent")

            parent = session.get(Node, node.parent_id)
            if parent is None:
                raise ValueError("Parent node not found")
            if parent.node_type != "campaign":
                raise ValueError("Milestone parent must be a campaign")
            if parent.location_id != node.location_id:
                raise ValueError("Node location mismatch")

            node.name = display_name
            session.commit()
            session.refresh(node)

            return _node_to_gql(node)
        finally:
            session.close()
