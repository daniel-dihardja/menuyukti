import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    ImageAiFlowsQuery,
    LocationsQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    NationalHolidaysQuery,
    NodesQuery,
    OperatingProfileQuery,
    WorkspaceQuery,
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
    WorkspaceQuery,
    ImageAiFlowsQuery,
):
    pass
