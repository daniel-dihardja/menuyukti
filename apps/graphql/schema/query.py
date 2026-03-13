import strawberry

from graphql.schema.queries import AnalyticsRunQuery, CampaignsQuery, LocationProfileQuery, LocationsQuery, NationalHolidaysQuery, OperatingProfileQuery


@strawberry.type
class Query(LocationsQuery, AnalyticsRunQuery, CampaignsQuery, NationalHolidaysQuery, OperatingProfileQuery, LocationProfileQuery):
    pass
