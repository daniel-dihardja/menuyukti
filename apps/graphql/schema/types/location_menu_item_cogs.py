from datetime import datetime

import strawberry


@strawberry.type
class LocationMenuItemCogsType:
    id: strawberry.ID
    locationId: int
    menu: str
    menuCategory: str | None
    menuCategoryDetail: str | None
    cogs: float
    currency: str | None
    createdAt: datetime
    updatedAt: datetime
