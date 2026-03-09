import strawberry

from graphql.schema.queries import AnalyticsRunQuery, LocationsQuery, NationalHolidaysQuery


@strawberry.type
class Query(LocationsQuery, AnalyticsRunQuery, NationalHolidaysQuery):
    pass
