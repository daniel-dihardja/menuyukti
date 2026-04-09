import secrets

import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.node_handlers import get_handler
from graphql.schema.types import NodeType

_ADJECTIVES = ("Swift", "Bright", "Urban", "Golden", "Fresh", "Bold")
_NOUNS = ("Launch", "Push", "Drive", "Wave", "Spark", "Pulse")


def _random_default_name() -> str:
    return f"{secrets.choice(_ADJECTIVES)} {secrets.choice(_NOUNS)} {secrets.token_hex(2).upper()}"


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
class CreateNodeMutation:
    @strawberry.mutation
    def create_node(
        self,
        info: strawberry.Info,
        location_id: int,
        node_type: str,
        name: str | None = None,
        parent_id: strawberry.ID | None = None,
        description: str | None = None,
        data: JSON | None = None,
    ) -> NodeType:
        user_id = user_id_from_info(info)
        if not user_id:
            raise ValueError("Missing authenticated user for createNode")

        with SessionLocal() as session:
            require_location_owner(session, location_id, user_id)

            display_name = name if name is not None and name.strip() else _random_default_name()

            parent: Node | None = None
            resolved_parent_id: int | None = None
            if parent_id is not None:
                try:
                    parent_pk = int(str(parent_id))
                except ValueError as e:
                    raise ValueError("Invalid parent node id") from e
                parent = session.get(Node, parent_pk)
                if parent is None:
                    raise ValueError("Parent node not found")
                if parent.location_id != location_id:
                    raise ValueError("Parent node does not belong to this location")
                resolved_parent_id = parent_pk

            handler = get_handler(node_type)
            resolved_data = handler.validate_create(parent, data, session)

            node = Node(
                parent_id=resolved_parent_id,
                name=display_name,
                description=description,
                path="",
                node_type=node_type,
                location_id=location_id,
                data=resolved_data,
            )
            session.add(node)
            session.flush()
            if parent is None:
                node.path = f"/{node.id}"
            else:
                node.path = f"{parent.path.rstrip('/')}/{node.id}"
            session.commit()
            session.refresh(node)

            return _node_to_gql(node)
