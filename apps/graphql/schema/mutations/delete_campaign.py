import strawberry

from graphql.data_sources import Campaign, SessionLocal
from graphql.schema.auth import require_location_owner, user_id_from_info


@strawberry.type
class DeleteCampaignMutation:
    @strawberry.mutation
    def delete_campaign(self, info: strawberry.Info, id: strawberry.ID) -> bool:
        user_id = user_id_from_info(info)
        session = SessionLocal()
        try:
            campaign = session.get(Campaign, int(id))
            if campaign is None:
                return False
            require_location_owner(session, campaign.location_id, user_id)
            session.delete(campaign)
            session.commit()
            return True
        finally:
            session.close()
