import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    CampaignBriefQuery,
    CampaignQuery,
    CampaignsQuery,
    LocationProfileQuery,
    LocationsQuery,
    NationalHolidaysQuery,
    OperatingProfileQuery,
)


@strawberry.type
class Query(
    LocationsQuery,
    AnalyticsRunQuery,
    CampaignQuery,
    CampaignsQuery,
    NationalHolidaysQuery,
    OperatingProfileQuery,
    LocationProfileQuery,
    CampaignBriefQuery,
):
    pass
