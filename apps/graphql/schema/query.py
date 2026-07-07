import strawberry

from graphql.schema.queries import (
    AnalyticsBundleQuery,
    AnalyticsRunQuery,
    CategoryMixQuery,
    ImageAiFlowsQuery,
    InstagramSignalsQuery,
    LatestAnalyticsRunWithSignalsQuery,
    LocationManualBriefInputQuery,
    LocationsQuery,
    MenuCatalogQuery,
    MenuCombosQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    MilestonePriorDataQuery,
    NodesQuery,
    OperatingProfileQuery,
    PostsQuery,
    PromotionEngineeringCandidatesQuery,
    PromotionMenuItemsQuery,
    PublicHolidaysQuery,
    RevenueTrendsQuery,
    WeeklyDemandPatternQuery,
    WorkflowCampaignTreeQuery,
    WorkspaceQuery,
)


@strawberry.type(
    description=(
        "Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, "
        "and workspace membership."
    )
)
class Query(
    WorkflowCampaignTreeQuery,
    AnalyticsBundleQuery,
    LatestAnalyticsRunWithSignalsQuery,
    LocationsQuery,
    LocationManualBriefInputQuery,
    NodesQuery,
    AnalyticsRunQuery,
    MenuCombosQuery,
    MenuHeatmapsQuery,
    MenuEngineeringMatrixQuery,
    MenuCatalogQuery,
    PromotionMenuItemsQuery,
    PromotionEngineeringCandidatesQuery,
    PublicHolidaysQuery,
    OperatingProfileQuery,
    PostsQuery,
    InstagramSignalsQuery,
    CategoryMixQuery,
    RevenueTrendsQuery,
    WeeklyDemandPatternQuery,
    MilestonePriorDataQuery,
    WorkspaceQuery,
    ImageAiFlowsQuery,
):
    pass
