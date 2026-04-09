import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    CategoryMixQuery,
    ImageAiFlowsQuery,
    InstagramSignalsQuery,
    LocationSocialSettingsQuery,
    LocationsQuery,
    MenuCatalogQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    MilestonePriorDataQuery,
    NodesQuery,
    OperatingProfileQuery,
    PromotionMenuItemsQuery,
    PublicHolidaysQuery,
    RevenueTrendsQuery,
    WeeklyDemandPatternQuery,
    WorkflowExportsQuery,
    WorkspaceQuery,
)


@strawberry.type
class Query(
    WorkflowExportsQuery,
    LocationsQuery,
    NodesQuery,
    AnalyticsRunQuery,
    MenuHeatmapsQuery,
    MenuEngineeringMatrixQuery,
    MenuCatalogQuery,
    PromotionMenuItemsQuery,
    PublicHolidaysQuery,
    OperatingProfileQuery,
    InstagramSignalsQuery,
    CategoryMixQuery,
    RevenueTrendsQuery,
    WeeklyDemandPatternQuery,
    LocationSocialSettingsQuery,
    MilestonePriorDataQuery,
    WorkspaceQuery,
    ImageAiFlowsQuery,
):
    pass
