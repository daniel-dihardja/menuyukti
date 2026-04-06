import secrets

import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types import NodeType

_ADJECTIVES = ("Swift", "Bright", "Urban", "Golden", "Fresh", "Bold")
_NOUNS = ("Launch", "Push", "Drive", "Wave", "Spark", "Pulse")


def _random_default_name() -> str:
    return f"{secrets.choice(_ADJECTIVES)} {secrets.choice(_NOUNS)} {secrets.token_hex(2).upper()}"


_PASS_CRITERIA_STATUSES = frozenset({"pass", "fail", "open"})


def _validate_passcriteria_payload(data: dict) -> None:
    requirement = data.get("requirement")
    status = data.get("status")
    if not isinstance(requirement, str):
        raise ValueError("passcriteria requirement must be a string")
    if status not in _PASS_CRITERIA_STATUSES:
        raise ValueError("passcriteria status must be pass, fail, or open")


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

            resolved_data = data
            if node_type == "passcriteria":
                if parent is None:
                    raise ValueError("passcriteria nodes must have a parent milestone")
                if parent.node_type != "milestone":
                    raise ValueError("passcriteria parent must be a milestone")
                if resolved_data is None:
                    resolved_data = {"requirement": "", "status": "open"}
                elif isinstance(resolved_data, dict):
                    base_pc = {"requirement": "", "status": "open"}
                    base_pc.update(resolved_data)
                    _validate_passcriteria_payload(base_pc)
                    resolved_data = base_pc
                else:
                    raise ValueError("passcriteria data must be a JSON object")

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
        finally:
            session.close()
