import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    CampaignBriefQuery,
    CampaignQuery,
    CampaignsQuery,
    LocationProfileQuery,
    LocationsQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    NationalHolidaysQuery,
    OperatingProfileQuery,
)


@strawberry.type
class Query(
    LocationsQuery,
    AnalyticsRunQuery,
    MenuHeatmapsQuery,
    MenuEngineeringMatrixQuery,
    CampaignQuery,
    CampaignsQuery,
    NationalHolidaysQuery,
    OperatingProfileQuery,
    LocationProfileQuery,
    CampaignBriefQuery,
):
    pass
