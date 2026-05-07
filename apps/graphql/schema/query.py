import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    ApiAdapterToolsQuery,
    CampaignSchedulePlanQuery,
    CategoryMixQuery,
    ImageAiFlowsQuery,
    InstagramSignalsQuery,
    LocationManualBriefInputQuery,
    LocationSocialSettingsQuery,
    LocationsQuery,
    MenuCatalogQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    MilestonePriorDataQuery,
    NodesQuery,
    OperatingProfileQuery,
    PromotionEngineeringCandidatesQuery,
    PromotionMenuItemsQuery,
    PublicHolidaysQuery,
    RevenueTrendsQuery,
    WeeklyDemandPatternQuery,
    WorkflowCampaignTreeQuery,
    WorkflowExportsQuery,
    WorkspaceQuery,
)


@strawberry.type(
    description=(
        "Root query: locations, workflow nodes, sales analytics runs, menu engineering, heatmaps, "
        "workspace membership, and custom API adapter tools."
    )
)
class Query(
    ApiAdapterToolsQuery,
    CampaignSchedulePlanQuery,
    WorkflowExportsQuery,
    WorkflowCampaignTreeQuery,
    LocationsQuery,
    LocationManualBriefInputQuery,
    NodesQuery,
    AnalyticsRunQuery,
    MenuHeatmapsQuery,
    MenuEngineeringMatrixQuery,
    MenuCatalogQuery,
    PromotionMenuItemsQuery,
    PromotionEngineeringCandidatesQuery,
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
