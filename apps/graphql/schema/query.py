import strawberry

from graphql.schema.queries import AnalyticsRunQuery, LocationProfileQuery, LocationsQuery, NationalHolidaysQuery, OperatingProfileQuery


@strawberry.type
class Query(LocationsQuery, AnalyticsRunQuery, NationalHolidaysQuery, OperatingProfileQuery, LocationProfileQuery):
    pass
