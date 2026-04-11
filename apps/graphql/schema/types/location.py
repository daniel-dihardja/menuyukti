import strawberry


@strawberry.type(description="A restaurant location; ties POS data and workflow roots to a workspace or legacy owner.")
class LocationType:
    id: strawberry.ID
    name: str
    street: str | None
    city: str | None
    country: str | None
    currency: str | None
    node_id: strawberry.ID | None
    workspace_id: strawberry.ID | None
