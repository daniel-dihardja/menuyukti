from datetime import datetime

import strawberry


@strawberry.type
class MenuItemCogsType:
    id: strawberry.ID
    analyticsRunId: int
    menu: str
    menuCategory: str | None
    menuCategoryDetail: str | None
    cogs: float
    currency: str | None
    createdAt: datetime
    updatedAt: datetime
