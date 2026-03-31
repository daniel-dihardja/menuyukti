import strawberry

from graphql.data_sources import CampaignBrief, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types import CampaignBriefType


@strawberry.type
class CampaignBriefQuery:
    @strawberry.field
    def campaign_brief(
        self,
        info: strawberry.Info,
        campaign_id: strawberry.ID,
    ) -> CampaignBriefType | None:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            row = (
                session.query(CampaignBrief)
                .filter(CampaignBrief.campaign_id == int(campaign_id))
                .first()
            )
            if row is None:
                return None
            if not is_location_owner(session, row.location_id, user_id):
                return None
            return CampaignBriefType(
                id=row.id,
                campaign_id=row.campaign_id,
                location_id=row.location_id,
                analytics_run_id=row.analytics_run_id,
                campaign_theme=row.campaign_theme,
                tone=row.tone,
                target_audience=row.target_audience,
                posting_cadence=row.posting_cadence,
                post_schedule_json=row.post_schedule_json,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )
        finally:
            session.close()
