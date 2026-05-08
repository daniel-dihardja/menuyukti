"""Map SQLAlchemy Node rows to Strawberry NodeType (single place for field parity)."""

from __future__ import annotations

from graphql.data_sources import Node
from graphql.schema.types.node import NodeType


def node_to_gql(row: Node) -> NodeType:
    return NodeType(
        id=str(row.id),
        name=row.name,
        description=row.description,
        node_type=row.node_type,
        path=row.path,
        parent_id=str(row.parent_id) if row.parent_id is not None else None,
        location_id=row.location_id,
        data=row.data,
        milestone_goal=row.milestone_goal,
        milestone_input=row.milestone_input,
        pass_criterias=row.pass_criterias,
        milestone_preset_data=row.milestone_preset_data,
        milestone_result=row.milestone_result,
    )
