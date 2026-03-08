import strawberry


@strawberry.type
class LocationType:
    id: strawberry.ID
    name: str
    street: str | None
    city: str | None
    country: str | None
