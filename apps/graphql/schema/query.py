import strawberry

from graphql.schema.queries import AnalyticsRunQuery, LocationsQuery


@strawberry.type
class Query(LocationsQuery, AnalyticsRunQuery):
    pass
