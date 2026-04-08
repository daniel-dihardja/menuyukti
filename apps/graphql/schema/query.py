import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    ImageAiFlowsQuery,
    LocationsQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    NodesQuery,
    OperatingProfileQuery,
    PublicHolidaysQuery,
    WorkspaceQuery,
)


@strawberry.type
class Query(
    LocationsQuery,
    NodesQuery,
    AnalyticsRunQuery,
    MenuHeatmapsQuery,
    MenuEngineeringMatrixQuery,
    PublicHolidaysQuery,
    OperatingProfileQuery,
    WorkspaceQuery,
    ImageAiFlowsQuery,
):
    pass
