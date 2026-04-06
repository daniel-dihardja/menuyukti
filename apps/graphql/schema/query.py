import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    LocationsQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    NationalHolidaysQuery,
    NodesQuery,
    OperatingProfileQuery,
)


@strawberry.type
class Query(
    LocationsQuery,
    NodesQuery,
    AnalyticsRunQuery,
    MenuHeatmapsQuery,
    MenuEngineeringMatrixQuery,
    NationalHolidaysQuery,
    OperatingProfileQuery,
):
    pass
