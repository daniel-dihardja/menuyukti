import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    CampaignBriefQuery,
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
    CampaignsQuery,
    NationalHolidaysQuery,
    OperatingProfileQuery,
    LocationProfileQuery,
    CampaignBriefQuery,
):
    pass
