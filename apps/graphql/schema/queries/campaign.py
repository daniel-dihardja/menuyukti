import strawberry

from graphql.data_sources import SessionLocal
from graphql.schema.auth import get_campaign_if_owner, user_id_from_info
from graphql.schema.types.campaign import CampaignType


@strawberry.type
class CampaignQuery:
    @strawberry.field
    def campaign(
        self,
        info: strawberry.Info,
        id: strawberry.ID,
    ) -> CampaignType | None:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            row = get_campaign_if_owner(session, int(id), user_id)
            if row is None:
                return None
            return CampaignType(
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
        finally:
            session.close()
