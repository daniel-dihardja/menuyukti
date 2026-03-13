import strawberry

from graphql.data_sources import Campaign, SessionLocal


@strawberry.type
class DeleteCampaignMutation:
    @strawberry.mutation
    def delete_campaign(self, id: strawberry.ID) -> bool:
        session = SessionLocal()
        try:
            campaign = session.get(Campaign, int(id))
            if campaign is None:
                return False
            session.delete(campaign)
            session.commit()
            return True
        finally:
            session.close()
