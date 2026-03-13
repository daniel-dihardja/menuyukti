from datetime import date, datetime

import strawberry


@strawberry.type
class CampaignType:
    id: int
    name: str
    goal: str | None
    start_date: date | None
    end_date: date | None
    theme: str | None
    tone: str | None
    status: str
    location_id: int
    created_at: datetime | None
