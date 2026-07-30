import strawberry

from graphql.schema.queries import (
    AnalyticsBundleQuery,
    AnalyticsRunQuery,
    CategoryMixQuery,
    CrmAppsQuery,
    CrmCustomersQuery,
    ImageAiFlowsQuery,
    InstagramSignalsQuery,
    LatestAnalyticsRunWithSignalsQuery,
    LocationManualBriefInputQuery,
    LocationsQuery,
    MediaCollectionsQuery,
    MenuCatalogQuery,
    MenuCombosQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
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
    MediaCollectionsQuery,
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
    InstagramSignalsQuery,
    CategoryMixQuery,
    RevenueTrendsQuery,
    WeeklyDemandPatternQuery,
    WorkspaceQuery,
    ImageAiFlowsQuery,
):
    pass
