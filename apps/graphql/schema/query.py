import strawberry

from graphql.schema.queries import (
    AiUsageQuery,
    AnalyticsBundleQuery,
    AnalyticsRunQuery,
    CategoryMixQuery,
    CrmAppsQuery,
    CrmCustomersQuery,
    InstagramSignalsQuery,
    InventoryCatalogQuery,
    InventoryRefillForecastQuery,
    InventoryStockMovementQuery,
    InventoryStockQuery,
    LocationMenuItemCogsQuery,
    LocationMenuQuery,
    LocationsQuery,
    MediaCollectionsQuery,
    MenuCatalogQuery,
    MenuCombosQuery,
    MenuEngineeringMatrixQuery,
    MenuHeatmapsQuery,
    OperatingProfileQuery,
    PlaybooksQuery,
    PostsQuery,
    PromotionMenuItemsQuery,
    PublicHolidaysQuery,
    PublicLocationWallQuery,
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
    LocationMenuItemCogsQuery,
    LocationMenuQuery,
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
    PublicLocationWallQuery,
    PlaybooksQuery,
    SchedulerCalendarQuery,
    OperatingProfileQuery,
    PostsQuery,
    InstagramSignalsQuery,
    CategoryMixQuery,
    RevenueTrendsQuery,
    WorkspaceQuery,
    InventoryCatalogQuery,
    InventoryStockQuery,
    InventoryStockMovementQuery,
    InventoryRefillForecastQuery,
    AiUsageQuery,
):
    pass
