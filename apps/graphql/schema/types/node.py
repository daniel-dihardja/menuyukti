import strawberry
from strawberry.scalars import JSON


@strawberry.type(
    description=(
        "A workflow tree node (workflow, etc.) stored in the polymorphic `node` table."
    )
)
class NodeType:
    id: strawberry.ID
    name: str
    description: str | None
    node_type: str
    path: str
    parent_id: strawberry.ID | None
    location_id: int | None
    data: JSON | None
