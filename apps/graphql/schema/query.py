import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    ApiAdapterToolsQuery,
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
    PromotionCandidatesSignalsQuery,
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
    WorkflowExportsQuery,
    WorkflowCampaignTreeQuery,
    LocationsQuery,
    NodesQuery,
    AnalyticsRunQuery,
    MenuHeatmapsQuery,
    MenuEngineeringMatrixQuery,
    MenuCatalogQuery,
    PromotionMenuItemsQuery,
    PromotionCandidatesSignalsQuery,
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
