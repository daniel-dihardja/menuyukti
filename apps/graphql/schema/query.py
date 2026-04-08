import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    ImageAiFlowsQuery,
    LocationsQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    NodesQuery,
    OperatingProfileQuery,
    PromotionMenuItemsQuery,
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
    PromotionMenuItemsQuery,
    PublicHolidaysQuery,
    OperatingProfileQuery,
    WorkspaceQuery,
    ImageAiFlowsQuery,
):
    pass
