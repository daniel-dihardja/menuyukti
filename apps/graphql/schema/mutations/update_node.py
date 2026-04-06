import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.node_handlers import get_handler
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
    def update_node(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
        name: str | None = None,
        data: JSON | None = None,
    ) -> NodeType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for updateNode")

        if name is None and data is None:
            raise ValueError("Provide at least one of name or data")

        display_name: str | None = None
        if name is not None:
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

            parent: Node | None = None
            if node.parent_id is not None:
                parent = session.get(Node, node.parent_id)

            handler = get_handler(node.node_type)
            handler.validate_update(node, parent, data)

            if display_name is not None:
                node.name = display_name
            if data is not None:
                node.data = handler.merge_update_data(node, data)

            session.commit()
            session.refresh(node)

            return _node_to_gql(node)
        finally:
            session.close()
