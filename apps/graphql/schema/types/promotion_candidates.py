from datetime import datetime

import strawberry
from strawberry.scalars import JSON


@strawberry.type
class PromotionCandidatesType:
    id: int
    campaign_id: int
    candidates_json: JSON
    created_at: datetime | None
    updated_at: datetime | None
