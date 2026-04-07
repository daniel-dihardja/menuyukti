import strawberry


@strawberry.type
class LocationType:
    id: strawberry.ID
    name: str
    street: str | None
    city: str | None
    country: str | None
    currency: str | None
    node_id: strawberry.ID | None
