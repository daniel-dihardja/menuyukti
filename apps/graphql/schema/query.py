import strawberry

from graphql.schema.queries import AnalyticsRunQuery, LocationsQuery, NationalHolidaysQuery, OperatingProfileQuery


@strawberry.type
class Query(LocationsQuery, AnalyticsRunQuery, NationalHolidaysQuery, OperatingProfileQuery):
    pass
