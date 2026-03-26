import strawberry

from graphql.schema.mutations import (
    CreateCampaignMutation,
    CreateLocationMutation,
    DeleteCampaignMutation,
    SaveCampaignBriefMutation,
    SaveLocationProfileMutation,
    UpdateMenuItemCogsBulkMutation,
    UploadSalesReportMutation,
)


@strawberry.type
class Mutation(
    UploadSalesReportMutation,
    CreateLocationMutation,
    CreateCampaignMutation,
    DeleteCampaignMutation,
    UpdateMenuItemCogsBulkMutation,
    SaveLocationProfileMutation,
    SaveCampaignBriefMutation,
):
    pass
