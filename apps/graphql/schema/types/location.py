import strawberry


@strawberry.type(description="Opening hours for one weekday.")
class OpeningHourType:
    day_of_week: str
    open_time: str
    close_time: str


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
    opening_hours: list[OpeningHourType]
