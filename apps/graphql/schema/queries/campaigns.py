import strawberry
from sqlalchemy import nulls_last

from graphql.data_sources import Campaign, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types.campaign import CampaignType


@strawberry.type
class CampaignsQuery:
    @strawberry.field
    def campaigns(self, info: strawberry.Info, location_id: int) -> list[CampaignType]:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            if not is_location_owner(session, location_id, user_id):
                return []
            rows = (
                session.query(Campaign)
                .filter(Campaign.location_id == location_id)
                .order_by(
                    nulls_last(Campaign.start_date.desc()),
                    Campaign.created_at.desc(),
                )
                .all()
            )
            return [
                CampaignType(
                    id=row.id,
                    name=row.name,
                    goal=row.goal,
                    start_date=row.start_date,
                    end_date=row.end_date,
                    theme=row.theme,
                    tone=row.tone,
                    status=row.status,
                    location_id=row.location_id,
                    created_at=row.created_at,
                )
                for row in rows
            ]
        finally:
            session.close()
