import strawberry

from graphql.schema.mutations import (
    CreateCampaignMutation,
    CreateLocationMutation,
    DeleteCampaignMutation,
    DeleteLocationProfileMutation,
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
    DeleteLocationProfileMutation,
    UpdateMenuItemCogsBulkMutation,
    SaveLocationProfileMutation,
    SaveCampaignBriefMutation,
):
    pass
