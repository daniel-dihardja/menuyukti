import strawberry

from graphql.schema.queries import (
    AiUsageQuery,
    AnalyticsBundleQuery,
    AnalyticsRunQuery,
    CategoryMixQuery,
    CrmAppsQuery,
    CrmCustomersQuery,
    ImageAiFlowsQuery,
    InstagramSignalsQuery,
    LocationsQuery,
    MediaCollectionsQuery,
    MenuCatalogQuery,
    MenuCombosQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    OperatingProfileQuery,
    PostsQuery,
    PromotionMenuItemsQuery,
    PublicHolidaysQuery,
    RevenueTrendsQuery,
    SchedulerCalendarQuery,
    StylesQuery,
    WorkspaceQuery,
)


@strawberry.type(
    description=(
        "Root query: locations, sales analytics runs, menu engineering, heatmaps, "
        "and workspace membership."
    )
)
class Query(
    AnalyticsBundleQuery,
    LocationsQuery,
    StylesQuery,
    MediaCollectionsQuery,
    CrmAppsQuery,
    CrmCustomersQuery,
    AnalyticsRunQuery,
    MenuCombosQuery,
    MenuHeatmapsQuery,
    MenuEngineeringMatrixQuery,
    MenuCatalogQuery,
    PromotionMenuItemsQuery,
    PublicHolidaysQuery,
    SchedulerCalendarQuery,
    OperatingProfileQuery,
    PostsQuery,
    InstagramSignalsQuery,
    CategoryMixQuery,
    RevenueTrendsQuery,
    WorkspaceQuery,
    ImageAiFlowsQuery,
    AiUsageQuery,
):
    pass
