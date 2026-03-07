from datetime import datetime
from typing import Optional

import strawberry


@strawberry.type
class MenuItemCogsType:
    id: strawberry.ID
    analyticsRunId: int
    menu: str
    menuCategory: Optional[str]
    menuCategoryDetail: Optional[str]
    cogs: float
    currency: Optional[str]
    createdAt: datetime
    updatedAt: datetime
