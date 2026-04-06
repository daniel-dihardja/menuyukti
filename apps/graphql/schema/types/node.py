import strawberry


@strawberry.type
class NodeType:
    id: strawberry.ID
    name: str
    node_type: str
    path: str
    parent_id: strawberry.ID | None
    location_id: int | None
