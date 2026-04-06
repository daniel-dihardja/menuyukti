import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
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
    NationalHolidaysQuery,
    OperatingProfileQuery,
):
    pass
