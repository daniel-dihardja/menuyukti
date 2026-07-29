import strawberry

from graphql.schema.queries import (
    AnalyticsBundleQuery,
    AnalyticsRunQuery,
    CategoryMixQuery,
    CrmAppsQuery,
    CrmCustomersQuery,
    IgPlanInputsQuery,
    ImageAiFlowsQuery,
    InstagramItemsQuery,
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
    SchedulerCalendarQuery,
    SlotMenuCandidatesQuery,
    StylesQuery,
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
    StylesQuery,
    CrmAppsQuery,
    CrmCustomersQuery,
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
    SchedulerCalendarQuery,
    OperatingProfileQuery,
    PostsQuery,
    InstagramItemsQuery,
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
