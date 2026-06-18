import strawberry

from graphql.context import request_session_scope
from graphql.data_sources import Node
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.node_handlers import get_handler


@strawberry.type
class DeleteNodeMutation:
    @strawberry.mutation
    def delete_node(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for deleteNode")

        try:
            node_pk = int(str(id))
        except ValueError as e:
            raise ValueError("Invalid node id") from e
        if node_pk < 1:
            raise ValueError("Invalid node id")

        with request_session_scope(info) as session:
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
            handler.pre_delete(node, parent, session)
            session.delete(node)
            session.commit()
            return True
