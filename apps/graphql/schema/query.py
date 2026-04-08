import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    CategoryMixQuery,
    ImageAiFlowsQuery,
    InstagramSignalsQuery,
    LocationsQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    NodesQuery,
    OperatingProfileQuery,
    PromotionMenuItemsQuery,
    PublicHolidaysQuery,
    RevenueTrendsQuery,
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
    InstagramSignalsQuery,
    CategoryMixQuery,
    RevenueTrendsQuery,
    WorkspaceQuery,
    ImageAiFlowsQuery,
):
    pass
