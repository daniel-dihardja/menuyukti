from datetime import date

import strawberry

from graphql.data_sources import Campaign, SessionLocal
from graphql.schema.types.campaign import CampaignType


@strawberry.type
class CreateCampaignMutation:
    @strawberry.mutation
    def create_campaign(
        self,
        location_id: int,
        name: str,
        goal: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        theme: str | None = None,
        tone: str | None = None,
    ) -> CampaignType:
        session = SessionLocal()
        try:
            campaign = Campaign(
                location_id=location_id,
                name=name,
                goal=goal,
                start_date=start_date,
                end_date=end_date,
                theme=theme,
                tone=tone,
                status="draft",
            )
            session.add(campaign)
            session.commit()
            session.refresh(campaign)
            return CampaignType(
                id=campaign.id,
                name=campaign.name,
                goal=campaign.goal,
                start_date=campaign.start_date,
                end_date=campaign.end_date,
                theme=campaign.theme,
                tone=campaign.tone,
                status=campaign.status,
                location_id=campaign.location_id,
                created_at=campaign.created_at,
            )
        finally:
            session.close()
