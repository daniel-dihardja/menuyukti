from datetime import datetime

import strawberry
from strawberry.scalars import JSON


@strawberry.type
class CampaignExportType:
    id: strawberry.ID
    campaign_id: strawberry.ID
    location_id: int
    payload: JSON
    schema_version: str
    created_at: datetime | None
    updated_at: datetime | None
