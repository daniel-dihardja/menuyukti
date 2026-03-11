from datetime import datetime

import strawberry


@strawberry.type
class LocationProfileType:
    id: int
    location_id: int
    analytics_run_id: int
    summary: str
    created_at: datetime | None
    updated_at: datetime | None
