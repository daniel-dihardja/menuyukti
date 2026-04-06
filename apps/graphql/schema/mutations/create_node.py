import secrets
import uuid

import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
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

        session = SessionLocal()
        try:
            require_location_owner(session, location_id, user_id)

            node_id = uuid.uuid4()
            display_name = name if name is not None and name.strip() else _random_default_name()

            if parent_id is None:
                path = f"/{node_id}"
                resolved_parent_id = None
            else:
                parent_uuid = uuid.UUID(str(parent_id))
                parent = session.get(Node, parent_uuid)
                if parent is None:
                    raise ValueError("Parent node not found")
                if parent.location_id != location_id:
                    raise ValueError("Parent node does not belong to this location")
                path = f"{parent.path.rstrip('/')}/{node_id}"
                resolved_parent_id = parent_uuid

            node = Node(
                id=node_id,
                parent_id=resolved_parent_id,
                name=display_name,
                description=description,
                path=path,
                node_type=node_type,
                location_id=location_id,
                data=data,
            )
            session.add(node)
            session.commit()
            session.refresh(node)

            return _node_to_gql(node)
        finally:
            session.close()
