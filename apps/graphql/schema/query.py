import strawberry

from graphql.schema.queries import (
    AnalyticsBundleQuery,
    AnalyticsRunQuery,
    CategoryMixQuery,
    IgPlanInputsQuery,
    ImageAiFlowsQuery,
    InstagramSignalsQuery,
    LatestAnalyticsRunWithSignalsQuery,
    LocationManualBriefInputQuery,
    LocationsQuery,
    LocationStylesQuery,
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
    SlotMenuCandidatesQuery,
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
    LocationStylesQuery,
    NodesQuery,
    AnalyticsRunQuery,
    MenuCombosQuery,
    MenuHeatmapsQuery,
    MenuEngineeringMatrixQuery,
    MenuCatalogQuery,
    PromotionMenuItemsQuery,
    PromotionEngineeringCandidatesQuery,
    SlotMenuCandidatesQuery,
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
    IgPlanInputsQuery,
):
    pass
