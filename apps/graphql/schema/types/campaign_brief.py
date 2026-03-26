from datetime import datetime

import strawberry


@strawberry.type
class CampaignBriefType:
    id: int
    campaign_id: int
    location_id: int
    analytics_run_id: int
    campaign_theme: str
    tone: str
    target_audience: str
    posting_cadence: str
    created_at: datetime | None
    updated_at: datetime | None
