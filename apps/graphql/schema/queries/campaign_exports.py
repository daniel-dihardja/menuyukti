"""List persisted campaign export snapshots for a location."""

import strawberry

from graphql.data_sources import CampaignExport, SessionLocal
from graphql.schema.auth import is_location_owner, user_id_from_info
from graphql.schema.types import CampaignExportType


def _export_row_to_gql(row: CampaignExport) -> CampaignExportType:
    return CampaignExportType(
        id=str(row.id),
        campaign_id=str(row.campaign_id),
        location_id=row.location_id,
        payload=row.payload,
        schema_version=row.schema_version,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@strawberry.type
class CampaignExportsQuery:
    @strawberry.field
    def campaign_exports(
        self,
        info: strawberry.Info,
        location_id: int,
    ) -> list[CampaignExportType]:
        user_id = user_id_from_info(info)
        if not user_id:
            return []
        session = SessionLocal()
        try:
            if not is_location_owner(session, location_id, user_id):
                return []
            rows = (
                session.query(CampaignExport)
                .filter(CampaignExport.location_id == location_id)
                .order_by(CampaignExport.updated_at.desc())
                .all()
            )
            return [_export_row_to_gql(r) for r in rows]
        finally:
            session.close()
