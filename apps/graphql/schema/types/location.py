import strawberry


@strawberry.type
class LocationType:
    id: strawberry.ID
    name: str
