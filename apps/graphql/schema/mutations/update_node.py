import strawberry
from strawberry.scalars import JSON

from graphql.data_sources import Node, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info
from graphql.schema.types import NodeType

_PASS_CRITERIA_STATUSES = frozenset({"pass", "fail", "neutral"})


def _validate_pass_criteria_items(items: object) -> None:
    if not isinstance(items, list):
        raise ValueError("passCriteria must be a list")
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError(f"passCriteria[{i}] must be an object")
        text = item.get("text")
        status = item.get("status")
        if not isinstance(text, str):
            raise ValueError(f"passCriteria[{i}].text must be a string")
        if status not in _PASS_CRITERIA_STATUSES:
            raise ValueError(f"passCriteria[{i}].status must be pass, fail, or neutral")


def _validate_milestone_data_patch(data: object) -> None:
    if not isinstance(data, dict):
        raise ValueError("data must be a JSON object")
    if "passCriteria" in data:
        _validate_pass_criteria_items(data["passCriteria"])


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

        if data is not None:
            _validate_milestone_data_patch(data)

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
                raise ValueError("Only milestones can be updated with this mutation")

            if node.parent_id is None:
                raise ValueError("Milestone has no parent")

            parent = session.get(Node, node.parent_id)
            if parent is None:
                raise ValueError("Parent node not found")
            if parent.node_type != "campaign":
                raise ValueError("Milestone parent must be a campaign")
            if parent.location_id != node.location_id:
                raise ValueError("Node location mismatch")

            if display_name is not None:
                node.name = display_name
            if data is not None:
                base = dict(node.data) if isinstance(node.data, dict) else {}
                base.update(data)
                node.data = base

            session.commit()
            session.refresh(node)

            return _node_to_gql(node)
        finally:
            session.close()
