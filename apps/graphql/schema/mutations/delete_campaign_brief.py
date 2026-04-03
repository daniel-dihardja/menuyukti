import strawberry

from graphql.data_sources import CampaignBrief, SessionLocal
from graphql.schema.auth import get_campaign_if_owner, user_id_from_info


@strawberry.type
class DeleteCampaignBriefMutation:
    @strawberry.mutation
    def delete_campaign_brief(self, info: strawberry.Info, campaign_id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            campaign = get_campaign_if_owner(session, int(campaign_id), user_id)
            if campaign is None:
                return False
            row = (
                session.query(CampaignBrief)
                .filter(CampaignBrief.campaign_id == int(campaign_id))
                .first()
            )
            if row is None:
                return False
            session.delete(row)
            session.commit()
            return True
        finally:
            session.close()
