import strawberry

from graphql.schema.queries import (
    AnalyticsRunQuery,
    CampaignExportsQuery,
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
    CampaignExportsQuery,
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
