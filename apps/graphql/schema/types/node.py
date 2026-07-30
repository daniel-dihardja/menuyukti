import strawberry
from strawberry.scalars import JSON


@strawberry.type(
    description="A polymorphic row in the `node` table (generic hierarchy; e.g. notes)."
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
